import { EventEmitter } from 'events';

import reviewDispatcher from '../dispatcher/reviewDispatcher';
import assign from 'object-assign';

let REVIEW_CHANGE_EVENT = 'reviewChange';

function getDefaults() {
  return {
    activeArticleIndex: -1,
    articles: [],
    user: '',
  }
}

function getReviewers() {
  return [ 'Andrey', 'Bot', 'Dale', 'Eric',  'Mike', 'Reid' ]
}

let reviewStore = assign({}, EventEmitter.prototype, {
  emitChange: function() { this.emit(REVIEW_CHANGE_EVENT); },

})
