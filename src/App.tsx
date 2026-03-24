// AxonClaw - Main App Component
import React from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from './renderer/components/layout/MainLayout';

function App() {
  useTranslation();
  return <MainLayout />;
}

export default App;
