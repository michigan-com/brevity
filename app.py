import os

import requests
from flask import Flask, render_template, request, jsonify, make_response
from bson.json_util import dumps
from summarizer.parser import Parser

from db import db_connect, mongo
from summary import process_article_summaries

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

def create_app():
    app = Flask(__name__)
    app.config['DEBUG'] = True

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
        email = request.args.get('email', None)
        if not email:
            print('No email')
            return jsonify({})

        reviews = mongo.db.SummaryReview.find({
            'picks': {
                '$not': {
                    '$exists': email
                }
            }
        })

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

    @app.route('/article/<int:article_id>/invalid/', methods=['GET', 'POST'])
    def invalid(article_id):
        flagged_sentence = request.values.get('sentence', None)
        if not flagged_sentence:
            raise Unprocessable('"sentence" not found')

        article = mongo.db.SummaryReview.find({ 'article_id': article_id }).limit(1)
        invalids = set(article['invalid'])
        invalids.add(flagged_sentence)

        mongo.db.SummaryReview.update({ 'article_id': article_id }, {
            "$set": {
                "invalid": invalids
            }
        })

        return jsonify({ 'success': True })

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

