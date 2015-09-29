# -*- coding: utf-8 -*-
from __future__ import print_function
import sys

#from pymongo import MongoClient
from summarizer import summarize

__version__ = '0.0.1'

class ArgumentError(Exception):
    pass

def connect(uri="mongodb://localhost:27017/mapi"):
    return MongoClient(uri)

def disconnect(client):
    return client.close()

def process_article_summaries(db):
    col = db.Article
    articles = col.find()
    skipped = 0
    summarized = 0
    for article in articles:
        if 'summary' in article and article['summary'] != "":
            print("Already found summary for {}, skipping ...".format(article['headline']), file=sys.stderr)
            skipped += 1
            continue

        print("Processing {} ...".format(article['headline']))

        if 'body' not in article or article['body'] == "":
            print("Body not found for {}, skipping ...".format(article['headline']), file=sys.stderr)
            skipped += 1
            continue

        article['summary'] = "".join(summarize(article['headline'], article['body']))
        col.replace_one({ '_id': article['_id'] }, article)
        summarized += 1

    return { 'skipped': skipped, 'summarized': summarized }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise ArgumentError("Requires mongodb uri, eg: python summarize.py mongodb://localhost:27017/mapi")

    uri = sys.argv[1]
    client = connect(uri)
    db = client.get_default_database()

    results = process_article_sumamries(db)

    disconnect(client)

    print("Skipped: {}".format(results['skipped']))
    print("Summarized: {}".format(results['summarized']))

