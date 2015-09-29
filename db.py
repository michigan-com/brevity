import os

from flask.ext.mongoalchemy import MongoAlchemy

db = MongoAlchemy()

class SummaryReview(db.Document):
    article_id = db.IntField()
    invalid = db.ListField(db.StringField(), default=[])
    picks = db.DictField(db.ListField(db.StringField()), default={})
    approved = db.BoolField(default=False)

    def json(self):
        return {
            'article_id': self.article_id,
            'invalid': self.invalid,
            'picks': self.picks,
            'approved': self.approved
        }

def db_connect(app):
    mongo_uri = os.getenv('MONGO_URI', None)
    if not mongo_uri:
        raise Exception('No MONGO_URI env variable set, cannot connect to DB')

    app.config['MONGOALCHEMY_CONNECTION_STRING'] = mongo_uri
    app.config['MONGOALCHEMY_DATABASE'] = 'mapi' # TODO abstract this, throws an error without

    db.init_app(app)
