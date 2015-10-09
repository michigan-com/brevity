'use strict';

import url from 'url';

import React from 'react';
import xr from 'xr';

require('historyjs/scripts/bundled/html4+html5/native.history.js');

import SummaryPicker from './model/summary-picker';
import { addMessage } from './model/flash-messages';

(async function() {
  let parsed = url.parse(window.location.href, true);
  let articleId;
  if (parsed.query && 'articleId' in parsed.query && !isNaN(parsed.query.articleId)) {
    articleId = parseInt(parsed.query.articleId);
  }

  let articles = [];
  try {
    articles = await getArticles();
  } catch (err) {
    console.log(err);
  }

  React.render(
    <ArticleList articles={ articles.reviews } />,
    document.getElementById('summary-review')
  );
}());

function getArticles(name='Eric') {
  return xr.get('/get-reviews/', { name });
};

class UserList extends React.Component {
  static defaultProps = {
    reviewers: [{
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
  };

  constructor(props) { super(props); };

  renderOption = (opt) => {
    return (
      <option value={ opt.name }>{ opt.name }</option>
    );
  };

  render() {
    return (
      <div className='select' id='user-select'>
        <select>
          <option value=''>Choose your name...</option>
          { this.props.reviewers.map(this.renderOption) }
        </select>
      </div>
    );
  };
}

class Article extends React.Component {
  state = {};
  static defaultProps = {
    user: '',
    option: {}
  };
  constructor(props) { super(props); };

  render() {
    let user = this.props.user;
    let invalid = false;
    let summaryChosen = false;
    let status = (
      <Status key={ this.props.id }
        className='summary-required'
        icon={ (<i className='fa fa-times'></i> ) }
        tooltip='You have not summarized this article yet'/>
    );

    if ('invalid' in this.props && this.props.invalid.length) {
      invalid = true;
      status = (
        <Status key={ this.props.id }
          className='flagged-article'
          icon={ (<i className='fa fa-flag'></i>) }
          tooltip='Article contains invalid sentences'/>
      );
    } else if (!('tokens_valid' in this.props) || !this.props.tokens_valid) {
      status = (
        <Status key={ this.props.id }
          className='invalid-tokens'
          icon={ (<i className='fa fa-exclamation-triangle'></i>) }
          tooltip='This article has not yet been validated.'/>
      );
    } else if ('summary' in this.props && user in this.props.summary && this.props.summary[user].length) {
      summaryChosen = true;
      status = (
        <Status key={ this.props.id }
          className='summary-added'
          icon={ (<i className='fa fa-check'></i>) }
          tooltip='You have chosen a summary for this article'/>
      );
    }

    return (
      <div className='article-option'>
        { status }
        <div className='headline'>{ this.props.headline }</div>
        <div className='article-summary-check hidden'>
          <div className='close-review'>
            { `< Back to articles` }
          </div>
        </div>
      </div>
    );
  };
}

class ArticleList extends React.Component {
  state = {
    user: ''
  };

  constructor(props) {
    super(props);
  };

  render() {
    let articles = this.props.articles.map(function(article, index) {
      return (
        <Article key={ article._id }
          id={ article._id }
          headline={ article.headline }
          sentences={ article.sentences }
          summary={ article.summary }
          url={ article.url } />
      );
    });

    return (
      <div>
        <UserList />
        <div className='article-options'>
          { articles }
        </div>
      </div>
    );
  };
}

// Name dropdown
class SummaryReview extends React.Component {
  state = {
    user: '',
    fetched: false,
    articles: [],
    activeArticleIndex: -1
  };

  constructor(props) {
    super(props);

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
  };

  getSummaries(name) {
    xr.get('/get-reviews/', { name }).then( res => {
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
      });
    });
  };

  /**
   * Save the summary for this user
   *
   * @memberof SummaryReview
   * @param {Number} articleId - ID of the article getting summarized
   * @param {Array[String]} summary - Array of sentences making up the summary. Limit length === 3
   * @param {Array[String]} flagged - Array of flagged sentences. If length > 0, @param summary will not be uploaded
   *
   */
  saveSummary = (articleId, summary, flagged_sentences) => {
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

        this.setState({ articles });
      }
    });
  };

  validateSummary = (articleId, tokens_valid) => {
    let article = this.state.articles[this.state.activeArticleIndex];

    xr.get(`/article/${articleId}/tokensValid/`, { tokens_valid }).then(res => {
      if (res.success) {
        addMessage(`Article "${article.headline}" marked as ${ tokens_valid ? 'valid' : 'invalid' }`)
        let articles = this.state.articles;
        articles[this.state.activeArticleIndex] = res.article;

        this.setState({ articles });
      }
    });
  };

  nameChange = (e) => {
    this.setState({ user: e.target.value });
    this.getSummaries(e.target.value);
  };

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

    this.setState({ activeArticleIndex: index });
  };

  renderArticleHeadline = (option, index) => {
    let user = this.state.user;
    let invalid = false;
    let summaryChosen = false;
    let status = (
      <Status className='summary-required'
        icon={ (<i className='fa fa-times'></i> ) }
        tooltip='You have not summarized this article yet'/>
    );

    if ('invalid' in option && option.invalid.length) {
      invalid = true;
      status = (
        <Status className='flagged-article'
            icon={ (<i className='fa fa-flag'></i>) }
            tooltip='Article contains invalid sentences'/>
      );
    } else if (!('tokens_valid' in option) || !option.tokens_valid) {
      status = (
        <Status className='invalid-tokens'
            icon={ (<i className='fa fa-exclamation-triangle'></i>) }
            tooltip='This article has not yet been validated.'/>
      );
    } else if ('summary' in option && user in option.summary && option.summary[user].length) {
      summaryChosen = true;
      status = (
        <Status className='summary-added'
            icon={ (<i className='fa fa-check'></i>) }
            tooltip='You have chosen a summary for this article'/>
      );
    }

    return (
      <div className='article-option' onClick={ this.activateArticle.bind(this, index) }>
        { status }
        <div className='headline'>{ option.headline }</div>
      </div>
    );
  }

  renderOption = (opt, index) => {
    return (
      <option value={ opt.name }>{ opt.name }</option>
    );
  };

  renderSelect() {
    return (
      <div className='select' id='user-select'>
        <select onChange={ this.nameChange } value={ this.state.user }>
          <option value=''>Choose your name...</option>
          { this.reviewers.map(this.renderOption) }
        </select>
      </div>
    );
  };

  render() {
    if (this.state.user == '') {
      return this.renderSelect();
    } else {
      if (this.state.activeArticleIndex == -1) {
        return (
          <div>
            { this.renderSelect() }
            <div>Hey { this.state.user }</div>
            <div className='article-options'>
              { this.state.articles.map(this.renderArticleHeadline) }
            </div>
          </div>
        );
      } else if (this.state.activeArticleIndex < this.state.articles.length ){
        let article = this.state.articles[this.state.activeArticleIndex];
        return (
          <div className='article-summary-check'>
            <div className='close-review' onClick={ this.activateArticle.bind(this, -1) }>{ `< Back to articles` }</div>
            <SummaryPicker onSave={ this.saveSummary }
                onValidate={ this.validateSummary }
                article={ article }
                user={ this.state.user }/>
          </div>
        );
      }
    }
  };
}

class Status extends React.Component {
  state = {
    showTooltip: false
  };

  constructor(props) {
    super(props);
  }

  toggleTooltip(showTooltip) {
    this.setState({ showTooltip });
  };

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
    );
  };
}

//<SummaryReview articleId={ articleId }/>,
