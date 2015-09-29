import React from 'react';
import xr from 'xr';


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

  getSummaries(email) {
    xr.get('/get-reviews/', { email })
    .then( res => {
      this.setState({
        articles: res.reviews
      })
    })
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
    return (
      <div className='article-option' onClick={ this.activateArticle.bind(this, index) }>
        <div className='headline'>{ option.headline }</div>
      </div>
    )
  }

  renderSelect() {
    function renderOption(opt, index) {
      return (
        <option value={ opt.email }>{ opt.name }</option>
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
        return (
          <div className='article-summary-check'>
            <div className='close-review' onClick={ this.activateArticle.bind(this, -1) }>X</div>
            { this.state.articles[this.state.activeArticleIndex].headline }
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
