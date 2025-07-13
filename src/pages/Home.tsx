import React from 'react';
import { Button } from '../components';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          OMT Audio Upload Website
        </h1>
        <p className="text-gray-600 mb-6">
          A high-performance, user-friendly web application for uploading and
          managing audio Bible recordings.
        </p>
        <Button onClick={() => console.log('Getting started!')}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Home; 