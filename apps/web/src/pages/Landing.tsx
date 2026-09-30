import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntroSequence } from '../components/IntroSequence';

export const Landing: React.FC = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const navigate = useNavigate();

  const handleQuestBegin = () => {
    setIntroComplete(true);
    // Navigate to the participant login page after intro finishes
    navigate('/login');
  };

  return (
    <div className="min-h-screen text-pirate-bone flex flex-col font-sans">
      {!introComplete && (
        <IntroSequence onComplete={handleQuestBegin} />
      )}
    </div>
  );
};
