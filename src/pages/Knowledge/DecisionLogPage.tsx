import React from 'react';
import DecisionLogSystem from '../../components/Knowledge/DecisionLogSystem';

const DecisionLogPage: React.FC = () => {
  return (
    <div>
      <DecisionLogSystem showCreateButton={true} />
    </div>
  );
};

export default DecisionLogPage;
