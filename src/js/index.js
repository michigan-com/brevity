'use strict';

import url from 'url';

import React from 'react';
import xr from 'xr';

require('historyjs/scripts/bundled/html4+html5/native.history.js');

import SummaryPicker from './model/summary-picker';
import { addMessage } from './model/flash-messages';

// Name dropdown
class SummaryReview extends React.Component {
  constructor() {
    super()

    this.state = {
      user: '',
      fetched: false,
      articles: [],
      activeArticleIndex: -1
    }

    this.reviewers = [{
        name: 'Dale',
        email: 'dparry@michigan.com'
    }, {
        name: 'Eric',
        email: 'ebower@michigan.com'
    }, {
        name: 'Mike',
        email: 'mvarano@michigan.com'
    }, {
        name: 'Reid',
        email: 'rwilliams@michigan.com'
    }, {
      name: 'Andrey',
      email: ''
    }]
  }

  getSummaries(name) {
    xr.get('/get-reviews/', { name })
    .then( res => {
      let activeArticleIndex = -1;
      if (this.props.articleId) {
        for (let i = 0; i < res.reviews.length; i++) {
          let review = res.reviews[i];
          if (review.article_id === this.props.articleId) {
            activeArticleIndex = i;
            break;
          }
        }
      }

      this.setState({
        articles: res.reviews,
        activeArticleIndex
      })
    })
  }

  /**
   * Save the summary for this user
   *
   * @memberof SummaryReview
   * @param {Number} articleId - ID of the article getting summarized
   * @param {Array[String]} summary - Array of sentences making up the summary. Limit length === 3
   * @param {Array[String]} flagged - Array of flagged sentences. If length > 0, @param summary will not be uploaded
   *
   */
  saveSummary(articleId, summary, flagged_sentences) {
    let article = this.state.articles[this.state.activeArticleIndex];
    let name = this.state.user;

    xr.get(`/article/${article.article_id}/summary/`, {
      flagged_sentences: JSON.stringify(flagged_sentences),
      summary: JSON.stringify(summary),
      name
    }).then(res => {
      if (res.success) {
        addMessage(`Article "${article.headline}" updated`)
        this.state.articles[this.state.activeArticleIndex] = res.article;
        this.activateArticle(-1)
      }
    });
  }

  nameChange(e) {
    this.setState({
      user: e.target.value
    });

    this.getSummaries(e.target.value)
  }

  activateArticle(index) {
    if (index === -1) {
      if (History.stateChanged) {
        History.back()
      } else {
        History.pushState({}, `Reviews`, '?')
      }
    } else {
      let articleId = this.state.articles[index].article_id;
      History.pushState({ articleId }, `Article ${articleId}`, `?articleId=${articleId}`);
    }
    this.setState({
      activeArticleIndex: index
    })
  }

  renderArticleHeadline(option, index) {
    let user = this.state.user;
    let invalid = false;
    let summaryChosen = false;
    let status;

    if ('invalid' in option && option.invalid.length) {
      invalid = true;
      status = (
        <div className='flagged-article'>
          <i className='fa fa-flag'></i>
        </div>
      )
    } else if ('summary' in option && user in option.summary) {
      summaryChosen = true;
      status = (
        <div className='summary-added'>
          <i className='fa fa-check'></i>
        </div>
      )
    } else if ('updated_at' in option) {
      status = (
        <div className='sentences-updated'>
          <i className='fa fa-recycle'></i>
        </div>
      )
    }
    return (
      <div className='article-option' onClick={ this.activateArticle.bind(this, index) }>
        <div className='status'>{ status }</div>
        <div className='headline'>{ option.headline }</div>
      </div>
    )
  }

  renderSelect() {
    function renderOption(opt, index) {
      return (
        <option value={ opt.name }>{ opt.name }</option>
      )
    }

    return (
      <div className='select' id='user-select'>
        <select onChange={ this.nameChange.bind(this) } value={ this.state.user }>
          <option value=''>Choose your name...</option>
          { this.reviewers.map(renderOption.bind(this)) }
        </select>
      </div>
    )
  }

  render() {
    if (this.state.user == '') {
      return this.renderSelect()
    } else {
      if (this.state.activeArticleIndex == -1) {
        return (
          <div>
            { this.renderSelect() }
            <div>Hey { this.state.user }</div>
            <div className='article-options'>
              { this.state.articles.map(this.renderArticleHeadline.bind(this)) }
            </div>
          </div>
        )
      } else if (this.state.activeArticleIndex < this.state.articles.length ){
        let article = this.state.articles[this.state.activeArticleIndex];
        return (
          <div className='article-summary-check'>
            <div className='close-review' onClick={ this.activateArticle.bind(this, -1) }>{ `< Back to articles` }</div>
            <SummaryPicker onSave={ this.saveSummary.bind(this) } article={ article } user={ this.state.user }/>
          </div>
        )
      }
    }
  }
}

let parsed = url.parse(window.location.href, true);
let articleId;
if (parsed.query && 'articleId' in parsed.query && !isNaN(parsed.query.articleId)) {
  articleId = parseInt(parsed.query.articleId);
}

React.render(
  <SummaryReview articleId={ articleId }/>,
  document.getElementById('summary-review')
)
