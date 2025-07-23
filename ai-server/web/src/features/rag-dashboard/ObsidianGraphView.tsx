// Obsidian-style force-directed relationship graph
import React from 'react';
import { useRAGFilter } from './RAGFilterBar';
const ObsidianGraphView: React.FC = () => {
    const { universe, book, chapter, character } = useRAGFilter();
    // Use these filters in future obsidian graph logic
    return <div>ObsidianGraphView (obsidian-style graph placeholder, universe: {universe}, book: {book}, chapter: {chapter}, character: {character})</div>;
};
export default ObsidianGraphView;
