'use strict';

import url from 'url';

import React from 'react';
import xr from 'xr';

require('historyjs/scripts/bundled/html4+html5/native.history.js');

import SummaryPicker from './obj/summary-picker';
import { addMessage } from './obj/flash-messages';

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
        name: 'Andrey',
        email: ''
    }, {
        name: 'Bot',
        email: 'me@andyourmoms.com'
    }, {
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
        let articles = this.state.articles;
        articles[this.state.activeArticleIndex] = res.article;

        this.setState({ articles })
      }
    });
  }

  validateSummary(articleId, tokens_valid) {
    let article = this.state.articles[this.state.activeArticleIndex];

    xr.get(`/article/${articleId}/tokensValid/`, { tokens_valid })
      .then(res => {
        if (res.success) {
          addMessage(`Article "${article.headline}" marked as ${ tokens_valid ? 'valid' : 'invalid' }`)
          let articles = this.state.articles;
          articles[this.state.activeArticleIndex] = res.article;

          this.setState({ articles })
        }
      })

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
    let status = (
      <Status className='summary-required'
        icon={ (<i className='fa fa-times'></i> ) }
        tooltip='You have not summarized this article yet'/>
    )

    if ('invalid' in option && option.invalid.length) {
      invalid = true;
      status = (
        <Status className='flagged-article'
            icon={ (<i className='fa fa-flag'></i>) }
            tooltip='Article contains invalid sentences'/>
      )
    } else if (!('tokens_valid' in option) || !option.tokens_valid) {
      status = (
        <Status className='invalid-tokens'
            icon={ (<i className='fa fa-exclamation-triangle'></i>) }
            tooltip='This article has not yet been validated.'/>
      )
    } else if ('summary' in option && user in option.summary && option.summary[user].length) {
      summaryChosen = true;
      status = (
        <Status className='summary-added'
            icon={ (<i className='fa fa-check'></i>) }
            tooltip='You have chosen a summary for this article'/>
      )
    }

    return (
      <div className='article-option' onClick={ this.activateArticle.bind(this, index) }>
        { status }
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
            <SummaryPicker onSave={ this.saveSummary.bind(this) }
                onValidate={ this.validateSummary.bind(this) }
                article={ article }
                user={ this.state.user }/>
          </div>
        )
      }
    }
  }
}

class Status extends React.Component {
  constructor(args) {
    super(args)

    this.state = {
      showTooltip: false
    }
  }

  toggleTooltip(showTooltip) {
    this.setState({ showTooltip })
  }

  render() {
    let className = 'status';
    if (this.props.className) className += ` ${this.props.className}`;

    return (
      <div className={ className }
          onMouseEnter={ this.toggleTooltip.bind(this, true) }
          onMouseLeave={ this.toggleTooltip.bind(this, false) }>
        { this.props.icon }
        <div className={ `tooltip ${this.state.showTooltip ? 'show' : '' }` }>
          { this.props.tooltip }
        </div>
      </div>
    )
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
