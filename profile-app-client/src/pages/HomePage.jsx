import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div>
      <h1>Iron Profile</h1>
      <p>Today we will create an app with authoritation, adding some cool styles</p>
      <Link to="/signup">
        <button>Sign up</button>
      </Link>
      <Link to="/login">
        <button>Log in</button>
      </Link>
    </div>
  );
};

export default HomePage;