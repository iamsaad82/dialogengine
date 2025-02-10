"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchVectors = exports.VectorStore = void 0;
// Temporär deaktiviert, da Vector Store noch in Entwicklung ist
class VectorStore {
    constructor() {
        throw new Error('Vector Store ist derzeit in Entwicklung.');
    }
    async searchSimilar() {
        throw new Error('Vector Store ist derzeit in Entwicklung.');
    }
    async addVectors() {
        throw new Error('Vector Store ist derzeit in Entwicklung.');
    }
    async initialize() {
        throw new Error('Vector Store ist derzeit in Entwicklung.');
    }
    async deleteCollection() {
        throw new Error('Vector Store ist derzeit in Entwicklung.');
    }
}
exports.VectorStore = VectorStore;
const searchVectors = async (query) => {
    console.log('Qdrant ist derzeit in Entwicklung');
    return [];
};
exports.searchVectors = searchVectors;
