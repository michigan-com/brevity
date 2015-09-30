import React from 'react';
import xr from 'xr';
import { addMessage } from './flash-messages';

var tokenCache = {};

export default class SummaryPicker extends React.Component {
  constructor(args) {
    super(args)

    this.state = {
      summaryLoaded: false,
      tokens: [],
      summarySentences: [], // Array of indexes
      flaggedSentences: [], // array of indexes
      articleSavePossible: false
    }
  }

  componentWillMount() {
    this.loadTokenizedBody()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.article.article_id != this.props.article.article_id) {
      this.loadTokenizedBody(nextProps.article.article_id)
    }
  }

  loadTokenData(tokens) {
    let user = this.props.user;
    let article = this.props.article;
    let summarySentences = [];
    let flaggedSentences = [];

    let summaryMap = {};
    if ('summary' in article && this.props.user in article.summary) {
      for (let summary of article.summary[user]) {
        summaryMap[summary] = true;
      }
    }

    let flaggedMap = {};
    if ('invalid' in article) {
      for (let invalid of article.invalid) {
        flaggedMap[invalid] = true;
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      if (token in summaryMap) {
        summarySentences.push(i);
      }
      if (token in flaggedMap) {
        flaggedSentences.push(i);
      }
    }

    this.setState({
      tokens,
      summarySentences,
      flaggedSentences
    })
  }

  loadTokenizedBody(articleId) {
    if (typeof articleId === 'undefined') articleId = this.props.article.article_id;
    if (articleId in tokenCache) {
      this.loadTokenData(tokenCache[articleId])
      return;
    }

    xr.get(`/article/${articleId}`)
      .then( res => {
        tokenCache[articleId] = res.tokens;
        this.loadTokenData(tokenCache[articleId])
      })
  }

  saveSummary() {
    let summary = [];
    let flagged = [];
    if (this.state.flaggedSentences.length) {
      for (var index in this.state.flaggedSentences) {
        flagged.push(this.state.tokens[index])
      }
    } else {
      for (var index of this.state.summarySentences) {
        summary.push(this.state.tokens[index])
      }
    }

    this.props.onSave(this.props.articleId, summary, flagged);
  }

  addSentence(index) {
    if (this.state.summarySentences.length == 3) {
      addMessage('Only 3 sentances per summary');
      return;
    } else if (index < 0 || index >= this.state.tokens.length) {
      addMessage('Invalid sentance');
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
      addMessage('Invalid sentance')
      return
    }

    let flaggedSentences = this.state.flaggedSentences
    flaggedSentences.push(index)
    let articleSavePossible = true;
    this.setState({ flaggedSentences, articleSavePossible })
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

    let articleSavePossible = flaggedSentences.length || this.state.summarySentences.length ? true : false;
    this.setState({ flaggedSentences, articleSavePossible })
  }

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
      flagOnClick = function() { addMessage('Sentance already selected as a summary') }
    } else if (this.state.flaggedSentences.indexOf(index) >= 0) {
      state = 'flagged';
      flagActive = true;
      flagOnClick = this.removeFlagged.bind(this, index);
      addOnClick = function() { addMessage('Sentance already flagged as invalid') }
    }

    return (
      <div className='sentence' key={`sentence-token-${index}`}>
        <div className='controls'>
          <SentenceControl type='add' active={ addActive } onClick={ addOnClick }/>
          <SentenceControl type='flag' active={ flagActive} onClick={ flagOnClick }/>
        </div>
        <div className='content'>{ sentence }</div>
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
      <div className='sentances'>
        { content }
      </div>
    )
  }

  renderSelections() {
    let summaries;
    if (this.state.flaggedSentences.length) {
      summaries = (
        <div className='no-summaries'>
          A flagged sentence is present, no summary will be saved.
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
          <div onClick={ this.saveSummary.bind(this) }className='save-summary'>Save Summary</div>
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
        <div className='headline'>{ this.props.article.headline }</div>
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
