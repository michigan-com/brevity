import os
import json
import datetime
import logging

import requests
from werkzeug import Response
from bson.objectid import ObjectId
from flask import Flask, render_template, request, jsonify, make_response

from db import db_connect, mongo
from summary import process_article_summaries

default_config = 'Dev'

class MongoJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        elif isinstance(obj, ObjectId):
            return str(obj)
        return json.JSONEncoder.default(self, obj)

def jsonify(*args, **kwargs):
    """ jsonify with support for MongoDB ObjectId """
    return Response(json.dumps(dict(*args, **kwargs), cls=MongoJsonEncoder), mimetype='application/json')

class Unprocessable(Exception):
    def __init__(self, message='Missing request parameters', data=None):
        self.message = message
        self.data = data
    def __str__(self):
        return repr(self.message)

class Unauthorized(Exception):
    def __init__(self, message='Unauthorized access to resource', data=None):
        self.message = message
        self.data = data
    def __str__(self):
        return repr(self.message)

class Config(object):
    DEBUG = True
    MONGO_URI = 'mongodb://localhost:27017/mapi'

class Prod(Config):
    DEBUG = False

class Dev(Config):
    pass

def create_app():
    config = os.getenv('CONFIG', default_config).title()
    if config not in [default_config, 'Prod']:
        config = default_config

    app = Flask(__name__)
    app.config.from_object('app.' + config)

    app.logger.addHandler(logging.StreamHandler())
    app.logger.setLevel(logging.INFO)

    app.logger.info(config)

    db_connect(app)

    @app.errorhandler(Unprocessable)
    def unprocessable(e):
        return make_response(jsonify({ 'message': e.message, 'data': e.data }), 422)

    @app.errorhandler(Unauthorized)
    def unauthorized(e):
        return make_response(jsonify({ 'message': e.message, 'data': e.data }), 401)

    @app.route('/')
    def review():
        return render_template('index.html')

    @app.route('/get-reviews/')
    def get_reviews():
        name = request.args.get('name')
        if not name:
            print('No email')
            return jsonify({})

        reviews = mongo.db.SummaryReview.find({})

        return jsonify({
            'reviews': list(reviews)
        })

    @app.route('/newsfetch-summarize/')
    def process_newsfetch_articles():
        results = process_article_summaries(mongo.db)
        return jsonify(results)

    @app.route('/article/<int:article_id>/summary/', methods=['GET', 'POST'])
    def add_summary(article_id):
        name = request.values.get('name')
        summary_sentences = request.values.get('summary')
        flagged_sentences = request.values.get('flagged_sentences')
        if not name:
            raise Unprocessable('Email not found')
        elif not summary_sentences:
            raise Unprocessable('Summary not found')
        elif not flagged_sentences:
            raise Unprocessable('Flagged sentences not found')

        summary_sentences = json.loads(summary_sentences)
        flagged_sentences = json.loads(flagged_sentences)

        article = mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)[0]

        if 'summary' not in article:
            article['summary'] = {}
        summary = article['summary']
        summary[name] = summary_sentences

        if 'invalid' not in article:
            article['invalid'] = []
        invalids = flagged_sentences

        tokens_valid = False if 'tokens_valid' not in article or not article['tokens_valid'] else True
        if flagged_sentences:
            tokens_valid = False


        article = mongo.db.SummaryReview.update({ 'article_id': article_id }, {
            '$set': {
                'summary': summary,
                'invalid': invalids,
                'tokens_valid': tokens_valid
            }
        })

        return jsonify({
            'success': True,
            'article': mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)[0]
        })

    @app.route('/article/<int:article_id>/vote/')
    def vote():
        votes = request.values.get('votes')
        if not votes:
            raise Unprocessable('"votes" not found')

        user = request.values.get('user')
        if not user:
            raise Unauthorized()

        article = db.SummaryReview.find({ 'article_id': article_id }).limit(1)
        votes = article['votes'][user]

        db.SummaryReview.update({ 'article_id': article_id }, {
            "$set": {
                "votes." + user: votes
            }
        })

        return jsonify({ 'success': True })

    @app.route('/article/<int:article_id>/tokensValid/')
    def set_tokens_valid(article_id):
        tokens_valid = request.args.get('tokens_valid', None)
        if tokens_valid is None:
            raise Unprocessable('Argument tokens_valid not found')

        tokens_valid = True if tokens_valid.lower() == 'true' else False

        article = mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)[0]
        if 'invalid' in article and article['invalid']:
            return jsonify({
                'success': False,
                'article': article
            })

        mongo.db.SummaryReview.update({ 'article_id': article_id }, {
            "$set": {
                "tokens_valid": tokens_valid
            }
        })

        return jsonify({
            'success': True,
            'article': mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)[0]
        })

    @app.route('/articles/valid-tokens/')
    def get_articles_with_valid_tokens():
        articles = mongo.db.SummaryReview.find({ 'tokens_valid': True })
        return jsonify({
            'success': True,
            'articles': list(articles)
        })

    return app

