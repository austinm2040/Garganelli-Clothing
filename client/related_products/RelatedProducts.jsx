import React, {useState, useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useUpdate} from '../../store/actions/product.js';
import axios from 'axios';
import token from '../env/config.js';
import averageReviewsCalculator from '../helperFunctions.js'
import Card from './components/Card.jsx'


axios.defaults.headers = {
  'Content-Type': 'application/json',
  Authorization : token
};





class CardTemplate extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      currentProductId : 11001,
      currentProductData: {
        id: '11001',
        category: "Jackets",
        nameWithText: "Camo Onesie",
        photo: "https://images.unsplash.com/photo-1501088430049-71c79fa3283e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=300&q=80",
        original_price: '$140',
        sale_price: null,
        comparableAspect1: 'Made from Animals',
        comparableAspect2: 'Edible',
        comparableAspect3: 'Electrically conducive',
        comparableAspect4: 'Rather snazzy'
      },
      currentProductStyle: null,
      relatedProductsData: {},
      myOutfit: {},
      modalId: null
    }
    this.formatData = this.formatData.bind(this);
    this.fetchRelatedProducts = this.fetchRelatedProducts.bind(this);
    this.findDefaultStyleIndex = this.findDefaultStyleIndex.bind(this);
    this.launchCompareModal = this.launchCompareModal.bind(this);
    this.closeCompareModal = this.closeCompareModal.bind(this);
    this.removeOutfit = this.removeOutfit.bind(this);
    this.addToOutfit = this.addToOutfit.bind(this);
    this.onMouseEnterHandler = this.onMouseEnterHandler.bind(this);
    this.onMouseLeaveHandler = this.onMouseLeaveHandler.bind(this);
    this.cardClickHandler = this.cardClickHandler.bind(this);
    this.determineAction = this.determineAction.bind(this);
    this.updateOverviewProduct = this.updateOverviewProduct.bind(this);
  }
  updateOverviewProduct (currentProductData, currentProductStyleData) {
    if (currentProductData === '') {
      return;
    }
    if (currentProductStyleData === undefined) {
      return;
    }
    console.log('how many times does this run?')
    let productId = currentProductData.id
    let relatedProducts = axios.get(`https://app-hrsei-api.herokuapp.com/api/fec2/hrnyc/products/${productId}/related`);
    // let currentProductRatingsData = axios.get(`https://app-hrsei-api.herokuapp.com/api/fec2/hrnyc/reviews/meta`, {params: {
    //   product_id: productId
    // }});
    return Promise.all([currentProductData, currentProductRatingsData,relatedProducts, currentProductStyleData])
    .then(results => {
      results[1] = results[1].data;
      return Promise.all([['currentProduct', results[0], results[1]], this.fetchRelatedProducts(results[2]), results[3]])
    })
    .then(results => {
      results[1] = results[1].map(result => result.data)
      this.setState ({
          currentProductData: this.formatData(results[0]),
          relatedProductsData: this.formatData(results[1]),
          currentProductStyle: results[2]
        })
      })
      .catch(error => console.error(error))
  }

  formatData (results) {
    let formattedData = {}
    let formattingCurrentProduct = results[0] === 'currentProduct' ? true : false;
    results = formattingCurrentProduct ? results.slice(1) : results;

    for (let i = 0; i < results.length; i++) {
      // console.log('in formatted Data', results[i])
      let data = results[i];
      let id = data.product_id || data.id.toString();
      if (formattingCurrentProduct) {
        if (formattedData.id === undefined) {
          formattedData.id = id
        }
      } else {
        if (formattedData[id] === undefined) {
          formattedData[id] = {id: id}
        }
      }
      let currentlyFormatting = formattingCurrentProduct ? formattedData : formattedData[id]

      //IF RATINGS API
      if (data.ratings) {
        currentlyFormatting.rating = averageReviewsCalculator.getAverageRating(data.ratings)
        //OTHERWISE IF FROM STYLES CALL
      } else if (data.product_id) {
        let styleIndex = this.findDefaultStyleIndex(data)
        currentlyFormatting.original_price = `$${Number(data.results[styleIndex].original_price)}`;
        currentlyFormatting.sale_price = data.results[styleIndex].sale_price;
        currentlyFormatting.photo = data.results[styleIndex].photos[0].url;
        currentlyFormatting.styles = data.results
        //ALL OTHER DATA
      } else {
        currentlyFormatting.category = data.category;
        currentlyFormatting.nameWithText = data.name;
        currentlyFormatting.features = {};
        data.features.forEach(item => {
          currentlyFormatting.features[item['feature']] = item.value
        })
      }
    }
    return formattedData;
  }

  findDefaultStyleIndex (data) {
    let defaultStyleIndex = 0;
    let defaultFound = false
    data.results.some((style, index)=> {
      style['default?'] ? (defaultStyleIndex = index, defaultFound = true) : defaultFound;
      return defaultFound;
    })
    return defaultStyleIndex
  }

  fetchRelatedProducts (results) {
    let relatedProductIds = results.data
    let relatedProductsData = relatedProductIds.map(relatedProduct =>
      axios.get(`https://app-hrsei-api.herokuapp.com/api/fec2/hrnyc/products/${relatedProduct}`))
    let relatedProductsThumbnails = relatedProductIds.map(relatedProduct =>
      axios.get(`https://app-hrsei-api.herokuapp.com/api/fec2/hrnyc/products/${relatedProduct}/styles`))
    let relatedProductsReviews = relatedProductIds.map(relatedProduct =>
      axios.get(`https://app-hrsei-api.herokuapp.com/api/fec2/hrnyc/reviews/meta`, {params: {
        product_id: relatedProduct
      }}))
    return Promise.all(relatedProductsData.concat(relatedProductsThumbnails).concat(relatedProductsReviews))
  }

  removeOutfit (productId) {
    let myOutfit_Copy = this.state.myOutfit;
    delete myOutfit_Copy[productId];
    this.setState({
      myOutfit: myOutfit_Copy
    });
  }

  launchCompareModal (currentProductData, relatedProductId) {
    if (this.state.modalId !== null) {
      return;
    }
    this.setState({
      modalId: relatedProductId
    })
  }

  closeCompareModal (e) {
    let modals = document.getElementsByClassName('comparison-modal')
    e.target.style.display = 'none';
    this.setState({
      modalId: null
    })
  }

  addToOutfit (productData, myOutfit) {
    let id = productData.id
    let chosenOutfitData_Copy = productData
    let myOutfit_Copy = myOutfit
    myOutfit_Copy[id] = chosenOutfitData_Copy;
    this.setState({
      myOutfit: myOutfit_Copy
    })
  }

  determineAction (className, productId) {
    className === 'action-modal' ? this.launchCompareModal(this.state.currentProductData, productId) : this.removeOutfit(productId)
  }

  thumbnailCarouselHandler (e) {
    //THIS FUNCTION SHOULD DEAL WITH A LAUNCHED THUMBNAIL CAROUSEL
    //PERHAPS A CLICK FUNCTION?  PERHAPS A HOVER FUNCTION?
  }

  onMouseEnterHandler (e) {
    let id = this.state.currentProductData.id
    if (e.target.className.includes('overview-linked')) {
      // console.log('OPEN THUMBNAIL CAROUSEL')
    } else if (e.target.className.includes('action')) {
      // console.log('OVER ACTION')
      e.target.style.opacity='100%'
    } else {
      let card = document.getElementById('addOutfitCard')
      card.style.opacity='100%';
    }
  }

  onMouseLeaveHandler (e) {
    if (e.target.className.includes('overview-linked')) {
      // console.log('CLOSE THUMBNAIL CAROUSEL')
    } else if (e.target.className.includes('action')) {
      // console.log('EXIT ACTION')
      e.target.style.opacity='50%'
    } else {
      let card = document.getElementById('addOutfitCard')
      card.style.opacity='50%';
    }
  }

  cardClickHandler (e) {
    let className = e.target.className;
    let productId = e.target.id;
    if (e.target.className.includes('overview-linked')) {
      ///THIS FUNCTION IS PASSED DOWN FROM APP.
      // this.updateOverviewProduct(e.target.id);
      this.props.setCurrentAppId(e.target.id);
    } else if (className.includes('action')) {
      this.determineAction(className, productId)
    } else {
      this.addToOutfit(this.state.currentProductData, this.state.myOutfit)
    }
  }

  componentDidUpdate () {
    // console.log('in componentDidUpdate', this.props.currentProduct, this.props);
    this.updateOverviewProduct(this.props.currentProduct, this.props.currentProductStyle)
  }
  componentDidMount () {
    // console.log('in componentDidMount', this.props.currentProduct);
    this.updateOverviewProduct(this.props.currentProduct, this.props.currentProductStyle)
  }

  render () {
    let relatedProductsContainerInlineStyle = {
      margin: 'auto',
      width : '920px',

    }
    let cardTitleInlineStyle = {
      fontFamily : 'Cormorant',
      fontWeight : 'bolder',
      fontSize : '16px'
    }

    let carouselInlineStyle = {
      marginTop: '30px',
      marginBottom: '50px',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'left',
    }

    let cardRowInlineStyle = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'left',
      gap: '10%'
    }

    let myOutfitContainer = {
      display: "flex",
      flexDirection: "row",
      gap: "10%"
    }

    let carouselLeftButton = {
      width: '70px',
      height: '70px',
      alignSelf: 'center',
      position: 'absolute',
      left: '30px',
      zIndex: 1
    }
    let carouselRightButton = {
      width: '70px',
      height: '70px',
      alignSelf: 'center',
      position: 'absolute',
      right: '10%',
      zIndex: 1,

    }

    // console.log('relatedProducts', this.state.relatedProductsData)
    // console.log('currentProducts', this.state.currentProductsData)

    if (this.state.currentProducts === undefined || Object.keys(this.state.currentProductsData).length === 0) {
      return (
        <div></div>
      )
    }

    let modalCompareButton = "./assets/relatedProductACTION.png";
    let removeOutfitButton = "./assets/myOutfitACTION.png";
    let addOutfitCard;
    let relatedProducts = Object.values(this.state.relatedProductsData).length ? Object.values(this.state.relatedProductsData) : null;
    let myOutfit = Object.values(this.state.myOutfit).length ? Object.values(this.state.myOutfit) : null
    let currentProductData = (this.state.currentProductData);
      if (relatedProducts !== null) {
        relatedProducts = relatedProducts.map(product => <Card
          key={product.id}
          relatedProductData={product}
          actionButton={modalCompareButton}
          closeCompareModal={this.closeCompareModal}
          cardClickHandler={this.cardClickHandler}
          onMouseEnterHandler={this.onMouseEnterHandler}
          onMouseLeaveHandler={this.onMouseLeaveHandler}
          outfitAdder={false}
          comparisonId={this.state.modalId}
          currentProductData={currentProductData}
          />)
      }
      if (myOutfit !== null) {
        myOutfit = myOutfit.map(product => <Card
          key={product.id}
          relatedProductData={product}
          currentProductData={currentProductData}
          actionButton={removeOutfitButton}
          cardClickHandler={this.cardClickHandler}
          onMouseEnterHandler={this.onMouseEnterHandler}
          onMouseLeaveHandler={this.onMouseLeaveHandler}
          outfitAdder={false}
          />)
      }
      if (this.state.currentProductData.id) {
        addOutfitCard =  <Card
          key={this.state.currentProductData.product_id}
          currentProductData={this.state.currentProductData}
          cardClickHandler={this.cardClickHandler}
          onMouseEnterHandler={this.onMouseEnterHandler}
          onMouseLeaveHandler={this.onMouseLeaveHandler}
          outfitAdder={true}
        />
      }
    return (
    <div>
      <div className="related-products-container" style={relatedProductsContainerInlineStyle}>
        <div className="related-products-title" style={cardTitleInlineStyle}>
          RELATED PRODUCTS
        </div>
        <div className="related-products-carousel" style={carouselInlineStyle}>
          <img src="./assets/carouselLeft.png" style={carouselLeftButton}></img>
          <div className="card-row" style={cardRowInlineStyle}>
            {relatedProducts}
          </div>
          <img src="./assets/carouselRight.png" style={carouselRightButton}></img>
        </div>
        <div className="my-outfit-title" style={cardTitleInlineStyle}>
          MY OUTFIT
        </div>
        <div className="my-outfit-container" style={myOutfitContainer}>
          <div className="add-outfit-card" style={carouselInlineStyle}>
            {addOutfitCard}
          </div>
          <div className="my-outfit-carousel" style={carouselInlineStyle}>
            <img src="./assets/carouselLeft.png" style={carouselLeftButton}></img>
            <div className="card-row" style={cardRowInlineStyle}>
              {myOutfit}
            </div>
            <img src="./assets/carouselRight.png" style={carouselRightButton}></img>
          </div>
        </div>
      </div>
    </div>
    )
  }
}

export default CardTemplate;

