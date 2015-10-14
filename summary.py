# -*- coding: utf-8 -*-
import sys

from pymongo import MongoClient
from summarizer import summarize, sanitize

class ArgumentError(Exception):
    pass

def connect(uri="mongodb://localhost:27017/mapi"):
    return MongoClient(uri)

def disconnect(client):
    return client.close()

def process_article_summaries(db, override=False):
    col = db.Article
    articles = None
    skipped = 0
    summarized = 0

    if override:
        articles = col.find()
    else:
        articles = col.find({
            "$or": [
                { "summary": { "$size": 0 } },
                { "summary": { "$exists": False } }
            ],
            "body": { "$ne": "" }
        })

        skipped = col.find({
            "summary": { "$not": { "$size": 0 }}
        }).count()

    for article in articles:
        #print("Processing {} ...".format(article['headline']))
        summary = summarize(article['headline'], article['body'])
        col.update({ '_id': article['_id'] }, { '$set': { 'summary': summary } })
        summarized += 1

    return { 'summarized': summarized, 'skipped': skipped }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ArgumentError("Requires mongodb uri, eg: python summarize.py mongodb://localhost:27017/mapi")

    uri = sys.argv[1]
    client = connect(uri)
    db = client.get_default_database()

    results = process_article_summaries(db, override=True)

    disconnect(client)

    print("Skipped: {}".format(results['skipped']))
    print("Summarized: {}".format(results['summarized']))

