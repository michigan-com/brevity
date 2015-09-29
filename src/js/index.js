import React from 'react';
import xr from 'xr';


// Name dropdown
class SummaryReview extends React.Component {
  constructor() {
    super()

    this.state = {
      user: '',
      fetched: false,
      articles: []
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

  renderArticleHeadline(option, index) {
    return (
      <div className='article-option'>
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
          { this.reviewers.map(renderOption) }
        </select>
      </div>
    )
  }

  render() {
    if (this.state.user == '') {
      return this.renderSelect()
    } else {
      return (
        <div>
          { this.renderSelect() }
          <div>Hey { this.state.user }</div>
          { this.state.articles.map(this.renderArticleHeadline) }
        </div>
      )
    }
  }
}


React.render(
  <SummaryReview/>,
  document.getElementById('summary-review')
)
