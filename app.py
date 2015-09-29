import os

from flask import Flask, render_template, request, jsonify, Blueprint
from bson.json_util import dumps

from db import db_connect, mongo
from summarize import process_article_summaries


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

    @app.route('/newsfetch-summarize/')
    def process_newsfetch_articles():
        results = process_article_summaries(mongo.db)
        return jsonify(results)

    #app.register_blueprint(blueprint)

    return app

