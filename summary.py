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
    articles = col.find()
    skipped = 0
    summarized = 0
    for article in articles:
        if not override and 'summary' in article and article['summary']:
            print("Already found summary for {}, skipping ...".format(article['headline']), file=sys.stderr)
            skipped += 1
            continue

        print("Processing {} ...".format(article['headline']))

        if 'body' not in article or article['body'] == "":
            print("Body not found for {}, skipping ...".format(article['headline']), file=sys.stderr)
            skipped += 1
            continue

        body = sanitize(article['body'])
        summary = summarize(article['headline'], body)
        col.update({ '_id': article['_id'] }, { '$set': { 'summary': summary } })
        summarized += 1

    return { 'skipped': skipped, 'summarized': summarized }

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

