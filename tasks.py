from invoke import task
import requests

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

def fetch_articles():
    r = requests.get('https://api.michigan.com/v1/news/?limit=100')

    return_data = r.json()

    num_added = 0
    num_repeats = 0
    num_invalid_body = 0
    for article in return_data[ 'articles' ]:
        article_id = article['article_id']
        article_headline = article['headline']
        summary = mongo.db.SummaryReview.find_one({
            'article_id': article_id
        })

        if not article['body']:
            print("Article {} does not have a body, skipping".format(article_id))
            num_invalid_body += 1
            continue

        if summary is None:
            summary = mongo.db.SummaryReview.insert({
                'article_id': article_id,
                'headline': article_headline
            })
            num_added += 1
        else:
            num_repeats += 1

    print("-" * 80)
    print("Articles fetched:\n")
    print("\tNumber added: {}".format(num_added))

    return
