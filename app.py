import os
import json

import requests
from flask import Flask, render_template, request, jsonify, make_response
from bson.json_util import dumps
from summarizer.parser import Parser

from db import db_connect, mongo
from summary import process_article_summaries

default_config = 'Dev'

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
        name = request.args.get('name', None)
        if not name:
            print('No email')
            return jsonify({})

        reviews = mongo.db.SummaryReview.find({})

        return dumps({
            'reviews': reviews
        })

    @app.route('/article/<int:article_id>/')
    def article(article_id):
        req = requests.get(''.join(['https://api.michigan.com/v1/article/', str(article_id)]))
        req.raise_for_status()

        article = req.json()
        parser = Parser()
        tokens = parser.split_sentences(article['body'])

        return jsonify({
            'article': article,
            'tokens': tokens
        })

    @app.route('/newsfetch-summarize/')
    def process_newsfetch_articles():
        results = process_article_summaries(mongo.db)
        return jsonify(results)

    @app.route('/article/<int:article_id>/summary/', methods=['GET', 'POST'])
    def add_summary(article_id):
        name = request.values.get('name', None)
        summary_sentences = request.values.get('summary', None)
        flagged_sentences = request.values.get('flagged_sentences', None)
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


        article = mongo.db.SummaryReview.update({ 'article_id': article_id }, {
            '$set': {
                'summary': summary,
                'invalid': invalids
            }
        })

        return dumps({
            'success': True,
            'article': mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)[0]
        })

    @app.route('/article/<int:article_id>/vote/')
    def vote():
        votes = request.values.get('votes', None)
        if not votes:
            raise Unprocessable('"votes" not found')

        user = request.values.get('user', None)
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

    return app

