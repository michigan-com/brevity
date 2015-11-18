# -*- coding: utf-8 -*-
from datetime import datetime
import random

from invoke import task
import requests
from summarizer import summarize, sanitize, Summarizer, Parser

from app import create_app
from summary import process_article_summaries
from db import mongo

app = create_app()
app.test_request_context().push()

@task
def run(host='0.0.0.0', port=3000):
    app.run(host=host, port=port)

@task
def summaries(override=False):
    print(process_article_summaries(mongo.db, override))

@task
def reprocess():
    articles = mongo.db.SummaryReview.find({})
    process(articles, False)

@task
def tokenize_article(articleid=None):
    if articleid is not None:
        articles = mongo.db.Article.find({'article_id': int(articleid)})
    else:
        print('grabbing random article...')
        articles = mongo.db.Article.find({'body': { '$ne': '' }})

    if not articles.count():
        print('Article id {} not found'.format(articleid) if articleid is not None else 'No articles fonud')
        return

    index = random.randint(0, articles.count() - 1)
    article = articles[index]

    sentences = parser.sentences(article['body'])

    print('Processing with {}'.format(parser.__class__.__name__))
    print('Sentences for Article {}'.format(article['article_id']))
    print('-' * 80)
    for s in sentences:
        print(s)
        print('-' * 80)


@task
def fetch_articles(update_all=False):
    r = requests.get('https://api.michigan.com/v1/news/?limit=100')
    r.raise_for_status()
    data = r.json()
    process(data['articles'], update_all=update_all)

def summary_indices(sentences, summary):
    indices = []
    for i, sentence in enumerate(sentences):
        if sentence in summary:
            indices.append(i)

    return indices

def process(articles, query_db=True, update_all=False):
    parser = Parser()
    summar = Summarizer(parser)

    num_added = 0
    num_updated = 0
    num_invalid_body = 0
    for article in articles:
        article_id = article['article_id']
        article_headline = article['headline']
        article_url = article['url']
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

        # sanitize step
        #body = sanitize(body)
        sentences = parser.sentences(body)
        summary = summarize(article['headline'], body, count=3, summarizer=summar)
        bot_indices = summary_indices(sentences, summary)

        if review is None:
            mongo.db.SummaryReview.insert({
                'article_id': article_id,
                'headline': article_headline,
                'url': article_url,
                'sentences': sentences,
                'summary': { 'Bot': bot_indices },
            })

            num_added += 1
            continue

        # remove all votes and flags if new sentences dont match old ones
        updated = False
        if 'sentences' not in review or len(review['sentences']) != len(sentences):
            updated = True
        else:
            for cur_sentence, new_sentence in zip(review['sentences'], sentences):
                if cur_sentence != new_sentence:
                    updated = True
                    break

        if updated or update_all:
            review['invalid'] = []
            review['summary'] = {
                'Bot': bot_indices
            }
            review['sentences'] = sentences
            review['updated_at'] = datetime.utcnow()
            review['tokens_valid'] = False
            mongo.db.SummaryReview.update({ '_id': review['_id'] }, review)
            num_updated += 1
        else:
            if 'summary' in review:
                review['summary']['Bot'] = bot_indices
            else:
                review['summary'] = { 'Bot': bot_indices }
            mongo.db.SummaryReview.update({ '_id': review['_id'] }, review)

    print("-" * 80)
    print("Articles fetched:\n")
    print("\tNumber added: {}".format(num_added))
    print("\tNumber updated: {}".format(num_updated))
    print("\tNumber invalid body: {}".format(num_invalid_body))


