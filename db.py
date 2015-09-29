import os

from flask_pymongo import PyMongo

mongo = PyMongo()

def db_connect(app):
    mongo_uri = os.getenv('MONGO_URI', None)
    if not mongo_uri:
        raise Exception('No MONGO_URI env variable set, cannot connect to DB')

    app.config['MONGO_URI'] = mongo_uri

    mongo.init_app(app)
