'use strict';

import React from 'react';
import { addMessage } from './flash-messages';
import clone from 'clone';

//var tokenCache = {};

export default class SummaryPicker extends React.Component {
  constructor(args) {
    super(args)

    this.state = {
      summarySentences: [], // Array of indexes
      flaggedSentences: [], // array of indexes
      articleSavePossible: false,
      annotations: false,
      article: clone(this.props.article),
    }
  }

  componentWillMount() {
    this.loadTokenData(this.state.article.sentences);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.article.article_id != this.state.article.article_id) {
      this.loadTokenData(nextProps.article.sentences);
    }

    let article = clone(nextProps.article);
    this.setState({ article })
  }

  annotate = () => {
    this.setState({ 'annotations': !this.state.annotations });
  }

  toggleValidateArticleTokens() {
    this.validateArticleTokens(!this.state.article.tokens_valid);
  }

  validateArticleTokens(tokens_valid) {
    let articleId = this.state.article.article_id;

    if (this.state.flaggedSentences.length) {
      addMessage('Please removed flagged sentences before validating this article');
      return;
    }

    this.props.onValidate(articleId, tokens_valid);
  }

  loadTokenData(tokens) {
    let user = this.props.user;
    let article = this.state.article;
    let summarySentences = []
    let flaggedSentences = [];

    if ('invalid' in this.state.article) {
      flaggedSentences = this.state.article.invalid
    }
    if (!flaggedSentences.length && 'summary' in this.state.article && user in this.state.article.summary) {
      summarySentences = this.state.article.summary[user]
    }

    this.setState({
      tokens,
      summarySentences,
      flaggedSentences
    })
  }

  saveSummary() {
    let summary = [];
    let flagged = [];
    if (this.state.flaggedSentences.length) {
      for (var index of this.state.flaggedSentences) {
        flagged.push(index)
      }
    } else {
      for (var index of this.state.summarySentences) {
        summary.push(index)
      }
    }

    this.props.onSave(this.state.articleId, summary, flagged);
  }

  addSentence(index) {
    if (this.state.summarySentences.length == 3) {
      addMessage('Only 3 sentences per summary');
      return;
    } else if (this.state.flaggedSentences.length) {
      addMessage('Cannot add a summary if there are flagged sentences');
      return;
    }
    else if (index < 0 || index >= this.state.tokens.length) {
      addMessage('Invalid sentence');
      return
    }

    let summarySentences = this.state.summarySentences;
    summarySentences.push(index);
    let articleSavePossible = summarySentences.length === 3 ? true : false;

    this.setState({ summarySentences, articleSavePossible })
  }

  removeSentence(index) {
    let found = false;
    let summarySentences = []
    for (var sentenceIndex of this.state.summarySentences) {
      if (index === sentenceIndex) {
        found = true;
      } else {
        summarySentences.push(sentenceIndex);
      }
    }

    if (!found) return;

    let articleSavePossible = summarySentences.length === 3 ? true : false;
    this.setState({ summarySentences, articleSavePossible })
  }

  flagSentence(index) {
    if (index < 0 || index >= this.state.tokens.length) {
      addMessage('Invalid sentence')
      return
    }

    let flaggedSentences = this.state.flaggedSentences
    flaggedSentences.push(index)

    let articleSavePossible = true;
    let article = this.state.article;
    article.tokens_valid = false;

    this.setState({ flaggedSentences, articleSavePossible, article })
  }

  removeFlagged(index) {
    let found = false;
    let flaggedSentences = [];
    for (var sentenceIndex of this.state.flaggedSentences) {
      if (index === sentenceIndex) {
        found = true;
      } else {
        flaggedSentences.push(sentenceIndex);
      }
    }

    if (!found) return;

    let articleSavePossible = true;

    if (!flaggedSentences.length && (!('invalid' in this.props.article) || !this.props.article.invalid.length)) {
      articleSavePossible = false;
    }
    this.setState({ flaggedSentences, articleSavePossible })
  }

  renderValidateButton() {
    return (
      <div onClick={ this.validateArticleTokens.bind(this, true) } className='validate-tokens'>
        Mark Sentences Valid
      </div>
    )
  }

  renderVote(user, index) {
    let classes = 'vote vote-' + user;
    return (
      <Vote name={ user } key={ `vote-${index}` }/>
    );
  };

  renderSentence(sentence, index) {
    let state;
    let addActive = false;
    let addOnClick = this.addSentence.bind(this, index);
    let flagActive = false;
    let flagOnClick = this.flagSentence.bind(this, index);
    if (this.state.summarySentences.indexOf(index) >= 0) {
      state = 'selected';
      addActive = true;
      addOnClick = this.removeSentence.bind(this, index);
      flagOnClick = function() { addMessage('Sentence already selected as a summary') }
    } else if (this.state.flaggedSentences.indexOf(index) >= 0) {
      state = 'flagged';
      flagActive = true;
      flagOnClick = this.removeFlagged.bind(this, index);
      addOnClick = function() { addMessage('Sentence already flagged as invalid') }
    }

    let votes = [];
    let voteContent;
    if (this.state.annotations) {
      for (let voter in this.state.article.summary) {
        if (this.state.article.summary[voter].indexOf(index) >= 0) {
          votes.push(this.renderVote(voter, votes.length));
        }
      }

      voteContent = (
        <div className='votes'>
          { votes }
        </div>
      )
    }

    return (
      <div className='sentence' key={`sentence-token-${index}`}>
        <div className='sentence-container'>
          <div className='controls'>
            <SentenceControl type='add' active={ addActive } onClick={ addOnClick }/>
            <SentenceControl type='flag' active={ flagActive} onClick={ flagOnClick }/>
            { voteContent }
          </div>
          <div className='content'>{ sentence }</div>
        </div>
        <hr/>
      </div>
    )
  }

  renderSummarySentence(sentenceIndex, index) {
    return (
      <div className='summary-sentence' key={ `summary-selection-${index}` }>
        <div className='remove'>
          <i onClick={ this.removeSentence.bind(this, sentenceIndex) } className='fa fa-times'></i>
        </div>
        <div className='content'>
          { this.state.tokens[sentenceIndex] }
        </div>
      </div>
    )
  }

  renderFlaggedSentence(sentenceIndex, index) {
    return (
      <div className='flagged-sentence' key={ `flagged-selection-${index}` }>
        <div className='remove'>
          <i onClick={ this.removeFlagged.bind(this, sentenceIndex) } className='fa fa-times'></i>
        </div>
        <div className='content'>
          { this.state.tokens[sentenceIndex] }
        </div>
      </div>
    )
  }

  renderSentences() {
    let content = (<div className='loading-sentences'>Loading sentences...</div>)
    if (this.state.tokens.length) {
      content = (
        <div className='content'>
          { this.state.tokens.map(this.renderSentence.bind(this)) }
        </div>
      )
    }

    return (
      <div className='sentences'>
        { content }
      </div>
    )
  }

  renderSelections() {
    let summaries;
    if (this.state.flaggedSentences.length) {
      summaries = (
        <div className='summary'>
          <h2>Summary</h2>
          A flagged sentence is present, no summary will be saved.
        </div>
      )
    } else if (!this.state.article.tokens_valid) {
      summaries = (
        <div className='summary choose-tokens'>
          <h2>Summary</h2>
          <div className='tokens-not-valid'>
            <i className='fa fa-exclamation-triangle'></i>
          </div>
          Please validate that the sentences in this article are broken up properly.
          { this.renderValidateButton() }
        </div>
      )
    } else {
      summaries = (
        <div className='summary'>
          <h2>Summary</h2>
          { this.state.summarySentences.map(this.renderSummarySentence.bind(this)) }
        </div>
      )
    }

    let articleSave;
    if (this.state.articleSavePossible) {
      articleSave = (
        <div className='save-button-container'>
          <div onClick={ this.saveSummary.bind(this) } className='save-summary'>Save Summary</div>
        </div>
      )
    }

    return (
      <div className='selections'>
        { summaries }
        <div className='flagged'>
          <h2>Flagged</h2>
          { this.state.flaggedSentences.map(this.renderFlaggedSentence.bind(this)) }
        </div>
        { articleSave }
      </div>
    )
  }


  render() {
    return (
      <div className='summary-picker'>
        <div className='headline'><a href={ this.state.article.url } target='_blank'>{ this.state.article.headline }</a></div>
        <div className='article-control'>
          <label>Show Annotations: <input type="checkbox" onChange={ this.annotate } /></label>
          <label> All sentences valid? <input type="checkbox" onChange={ this.toggleValidateArticleTokens.bind(this) } checked={ this.state.article.tokens_valid ? 1 : 0 }/></label>
        </div>
        { this.renderSelections() }
        { this.renderSentences() }
      </div>
    )
  }
}

class SentenceControl extends React.Component{
  constructor(args) {
    super(args)
  }

  renderControl() {
    if (this.props.type === 'add') {
      return  (
        <i className={ `fa fa-plus ` }></i>
      )
    } else if (this.props.type === 'flag'){
      return (
        <i className={ `fa fa-flag ` }></i>
      )
    }
  }

  render() {
    return (
      <div onClick={ this.props.onClick } className={ `control ${this.props.type} ${this.props.active ? 'active': ''}` }>
        { this.renderControl()  }
      </div>
    )
  }
}

class Vote extends React.Component {
  constructor(args) {
    super(args)

    this.state = {
      hover: false
    }

    this.letter = this.props.name && this.props.name.length ? this.props.name[0] : '';
  }

  toggleHover(hover) {
    this.setState({ hover })
  }

  render() {
    return (
      <div className={ `vote vote-${this.props.name}` }>
        <div onMouseEnter={ this.toggleHover.bind(this, true) }
            onMouseLeave={ this.toggleHover.bind(this, false) }
            className='vote-bubble'>
          { this.letter }
        </div>
        <div className={ `vote-tooltip tooltip ${this.state.hover ? 'show' : ''}` }>{ this.props.name }</div>
      </div>
    )
  }
}
