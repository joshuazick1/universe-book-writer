Based on your current benchmark types (`json-assembly`, `task-planning`, `creative-writing`, `typescript-quality`), here are additional task types you should consider adding to comprehensively evaluate AI model and server performance for your multi-universe book writing assistant:

### 1. **Dialogue Generation**
- **Purpose:** Assess the model’s ability to generate in-universe character dialogue that is contextually appropriate and stylistically accurate.
- **Prompt Example:** "Write a short conversation between a Starfleet captain and a Romulan ambassador negotiating a ceasefire."
- **Rubric:** Dialogue realism, character voice, adherence to universe lore, turn-taking, and emotional tone.

### 2. **Fact Extraction / Knowledge QA**
- **Purpose:** Test the model’s ability to extract or answer factual questions about the universe.
- **Prompt Example:** "Who was the first captain of the USS Enterprise in Star Trek?"
- **Rubric:** Factual accuracy, conciseness, and citation of in-universe sources if possible.

### 3. **Summarization**
- **Purpose:** Evaluate the model’s ability to summarize long passages or chapters into concise abstracts.
- **Prompt Example:** "Summarize the following chapter in 3 sentences."
- **Rubric:** Coverage of key points, brevity, and clarity.

### 4. **Content Moderation / Safety**
- **Purpose:** Ensure generated content adheres to safety, appropriateness, and universe-specific rules.
- **Prompt Example:** "Review the following text for inappropriate content or lore violations."
- **Rubric:** Detection accuracy, false positive/negative rate, and actionable feedback.

### 5. **Style Transfer**
- **Purpose:** Assess the model’s ability to rewrite text in a specific author’s or universe’s style.
- **Prompt Example:** "Rewrite this scene in the style of Isaac Asimov."
- **Rubric:** Stylistic fidelity, preservation of meaning, and fluency.

### 6. **Code Generation (Advanced)**
- **Purpose:** Go beyond simple TypeScript—test for more complex code tasks, such as generating utility functions, classes, or even plugin skeletons.
- **Prompt Example:** "Write a TypeScript class for a Starship with methods for warp and impulse travel."
- **Rubric:** Correctness, type safety, idiomatic usage, and documentation.

### 7. **Node/Graph Construction**
- **Purpose:** Evaluate the model’s ability to generate or update knowledge graph nodes (e.g., for characters, locations, events).
- **Prompt Example:** "Create a node for the planet Vulcan with relevant metadata."
- **Rubric:** Schema adherence, completeness, and correct linking to other nodes.

### 8. **Long-Form Generation**
- **Purpose:** Test the model’s ability to generate multi-paragraph or chapter-length content with coherence and narrative structure.
- **Prompt Example:** "Write the first chapter of a Star Trek novel introducing a new crew."
- **Rubric:** Coherence, pacing, character development, and universe consistency.

---

**Tip:** For each new task type, define:
- A clear prompt template
- A reference output (if possible)
- An automated rubric for scoring (schema, BLEU/ROUGE, etc.)
- Unit tests and documentation per your project standards

