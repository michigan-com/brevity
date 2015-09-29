import os

from flask import Flask, render_template, request, jsonify, Blueprint
from db import db_connect, mongo
from summarize import process_article_summaries

reviewers = [{
    'name': 'Dale',
    'email': 'dparry@michigan.com'
}, {
    'name': 'Eric',
    'email': 'ebower@michigan.com'
}, {
    'name': 'Mike',
    'email': 'mvarano@michigan.com'
}, {
    'name': 'Reid',
    'email': 'rwilliams@michigan.com'
}]

def create_app():
    app = Flask(__name__)
    app.config['DEBUG'] = True

    db_connect(app)

    #blueprint = Blueprint("default", "default", template_folder=os.path.join('.', 'templates'))

    @app.route('/')
    def review():
        return render_template('index.html', reviewers=reviewers)

    @app.route('/get-reviews/')
    def get_reviews():
        unapproved_reviews = SummaryReview.query.filter(SummaryReview.approved==False) \
            .limit(10).ascending(SummaryReview.mongo_id)

        reviews = [r.json() for r in unapproved_reviews]

        return jsonify({
            'reviews': reviews
        })

    @app.route('/newsfetch-summarize/')
    def process_newsfetch_articles():
        results = process_article_summaries(mongo.db)

        return jsonify({
            'success': True
        })

    #app.register_blueprint(blueprint)

    return app

