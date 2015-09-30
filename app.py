import os

import requests
from flask import Flask, render_template, request, jsonify, Blueprint
from bson.json_util import dumps
from summarizer import summarize

from db import db_connect, mongo
from summary import process_article_summaries

def create_app():
    app = Flask(__name__)
    app.config['DEBUG'] = True

    db_connect(app)

    #blueprint = Blueprint("default", "default", template_folder=os.path.join('.', 'templates'))

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
        summary = summarize(article['headline'], article['body'])

        return render_template('article.html', article=article, summary=summary)

    @app.route('/newsfetch-summarize/')
    def process_newsfetch_articles():
        results = process_article_summaries(mongo.db)
        return jsonify(results)

    #app.register_blueprint(blueprint)

    return app

