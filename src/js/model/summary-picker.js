import React from 'react';
import xr from 'xr';

export default class SummaryPicker extends React.Component {
  constructor(args) {
    super(args)
    this.state = {
      summaryLoaded: false,
      tokens: []
    }

    this.tokenCache = {}
  }

  loadTokenizedBody() {
    if (this.props.articleId in this.tokenCache) {
      this.setState({
        tokens: this.tokenCache[this.props.articleId]
      });
      return;
    }

    xr.get(`/article/${this.props.articleId}`)
      .then( res => {
        this.tokenCache[this.props.articleId] = res.tokens;
        this.setState({
          tokens: res.tokens
        })
      })

  }

  componentWillMount() {

  }

  renderSentence(sentence, index) {
    return (
      <div className='sentance'>
        <div className='controls'>Controls</div>
        <div className='content'>{ sentence }</div>
      </div>
    )
  }

  render() {
    return (
      <div className='summary-picker'>
        <div className='headline'>{ this.props.headline }</div>
        <div className='sentances'>
          { this.state.tokens.map(renderSentence.bind(this)) }
        </div>
      </div>
    )
  }
}
