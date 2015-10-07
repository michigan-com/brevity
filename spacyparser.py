from spacy.en import English
from summarizer.parser import Parser

nlp = English()

class SpacyParser(Parser):
    def sentences(self, text):
        if not text:
            return []
        doc = nlp(text)
        return [span.text_with_ws for span in doc.sents]
