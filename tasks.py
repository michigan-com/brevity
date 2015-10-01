# -*- coding: utf-8 -*-
from datetime import datetime
from invoke import task
import requests
from summarizer.parser import Parser
from summarizer import summarize

from app import create_app
from db import mongo

app = create_app()
app.test_request_context().push()

@task
def run(host='0.0.0.0', port=3000):
    app.run(host=host, port=port)

@task
def fetch_articles_task():
    fetch_articles()

@task
def reprocess():
    articles = mongo.db.SummaryReview.find({})
    process(articles, False)

def fetch_articles():
    r = requests.get('https://api.michigan.com/v1/news/?limit=100')
    r.raise_for_status()
    data = r.json()
    process(data['articles'])

def process(articles, query_db=True):
    parser = Parser()

    num_added = 0
    num_updated = 0
    num_invalid_body = 0
    for article in articles:
        article_id = article['article_id']
        article_headline = article['headline']
        body = article.get('body', None)
        review = article

        if query_db:
            review = mongo.db.SummaryReview.find_one({
                'article_id': article_id
            })

        if not body:
            art = mongo.db.Article.find_one({ 'article_id': article_id })
            if not art or not art['body']:
                print("Article {} does not have a body, skipping".format(article_id))
                num_invalid_body += 1
                continue

            body = art['body']

        sentences = parser.split_sentences(body)
        summary = summarize(article['headline'], body)

        if review is None:
            mongo.db.SummaryReview.insert({
                'article_id': article_id,
                'headline': article_headline,
                'sentences': sentences,
                'bot_summary': summary,
            })

            num_added += 1
            continue

        # remove all votes and flags if new sentences dont match old ones
        updated = False
        if len(review['sentences']) != len(sentences):
            updated = True
        else:
            for cur_sentence, new_sentence in zip(review['sentences'], sentences):
                if cur_sentence != new_sentence:
                    updated = True
                    break

        if updated:
            review['invalids'] = []
            review['votes'] = {}
            review['sentences'] = sentences
            review['bot_summary'] = summary
            review['updated_at'] = datetime.utcnow()
            mongo.db.SummaryReview.update({ '_id': review['_id'] }, review)
            num_updated += 1

    print("-" * 80)
    print("Articles fetched:\n")
    print("\tNumber added: {}".format(num_added))
    print("\tNumber updated: {}".format(num_updated))
    print("\tNumber invalid body: {}".format(num_invalid_body))

