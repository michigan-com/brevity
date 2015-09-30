import React from 'react';
import xr from 'xr';
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
    }]
  }

  getSummaries(name) {
    xr.get('/get-reviews/', { name })
    .then( res => {
      this.setState({
        articles: res.reviews
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

    if (flagged_sentences.length) {
      xr.get(`/article/${article.article_id}/invalid/`, {
        flagged_sentences: JSON.stringify(flagged_sentences)
      }).then(res => {
          if (res.success) {
            addMessage(`Article "${article.headline}" updated with flagged sentences`)
            this.state.articles[this.state.activeArticleIndex] = res.article;
            this.setState({
              activeArticleIndex: -1
            })
          }
        });
    } else if (summary.length) {
      xr.get(`/article/${article.article_id}/summary/`, {
        summary: JSON.stringify(summary),
        name
      }).then(res => {
          if (res.success) {
            addMessage(`Article "${article.headline}" updated with summary from ${this.state.user}`)
            this.state.articles[this.state.activeArticleIndex] = res.article;
            this.setState({
              activeArticleIndex: -1
            })
          }
        })
    }
  }

  nameChange(e) {
    this.setState({
      user: e.target.value
    });

    this.getSummaries(e.target.value)
  }

  activateArticle(index) {
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
            <div className='close-review' onClick={ this.activateArticle.bind(this, -1) }>X</div>
            <SummaryPicker onSave={ this.saveSummary.bind(this) } article={ article } user={ this.state.user }/>
          </div>
        )
      }
    }
  }
}


React.render(
  <SummaryReview/>,
  document.getElementById('summary-review')
)
