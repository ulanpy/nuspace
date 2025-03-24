import React from 'react';
import Carousel from '../components/Carousel.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from '../components/Header.jsx';
import nuentrance from '../assets/NU_entrance.jpg'
import birdPOV from '../assets/NU_birdpov.jpg'
import Menu from '../components/Menu.jsx';

const Homepage = () => {
  let slides = [
    {img: nuentrance},
    {img: birdPOV}
]

  return (
    <Router>
      <Header />
      <div className='w-1/2 m-auto'>
        <Carousel slides={slides}/>
      </div>
      <Menu />
    </Router>
  );
};


export default Homepage;
