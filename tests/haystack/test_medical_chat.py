from haystack import Pipeline, Document
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.components.retrievers.in_memory import InMemoryBM25Retriever
from haystack.components.generators import OpenAIGenerator
from haystack.components.builders import PromptBuilder
from haystack.dataclasses import ChatMessage
from haystack.utils import Secret
from dotenv import load_dotenv
import os

# Lade Umgebungsvariablen aus .env
load_dotenv()

# Beispiel-Dokumente für den medizinischen Kontext
MEDICAL_DOCS = [
    Document(content="""
        Bei einem Krankenhausaufenthalt übernimmt die AOK folgende Leistungen:
        - Stationäre Behandlung und Untersuchungen
        - Operationen und Behandlungen
        - Medikamente und Heilmittel
        - Pflegerische Versorgung
        - Unterbringung und Verpflegung
        
        Zuzahlung: 10 € pro Tag für maximal 28 Tage im Jahr
        """),
    Document(content="""
        Bei längeren Krankenhausaufenthalten:
        - Krankengeld nach Ende der Lohnfortzahlung
        - Maximale Zuzahlung von 280 € pro Jahr
        - Unterstützung bei Reha-Maßnahmen
        - Beratung zu Pflegeleistungen
        """),
    Document(content="""
        Lohnfortzahlung im Krankheitsfall:
        - 6 Wochen Lohnfortzahlung durch Arbeitgeber
        - Danach Krankengeld durch die AOK
        - Höhe: 70% vom Bruttolohn
        - Maximale Bezugsdauer: 78 Wochen
        """)
]

def create_medical_chat_pipeline():
    # Document Store initialisieren
    document_store = InMemoryDocumentStore()
    document_store.write_documents(MEDICAL_DOCS)
    
    # Pipeline für medizinische Anfragen
    pipe = Pipeline()
    
    # OpenAI-Konfiguration
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    
    # Kontext-Template für Follow-up-Fragen
    context_prompt = """
    Du bist ein AOK-Kundenberater. Beantworte die Frage basierend auf folgendem Kontext:
    
    Dokumente:
    {% for doc in documents %}
        {{ doc.content }}
    {% endfor %}
    
    Bisherige Konversation: {{ chat_history }}
    
    Aktuelle Frage: {{ question }}
    
    Wichtig:
    - Antworte nur basierend auf den gegebenen Informationen
    - Strukturiere die Antwort mit Emojis und Aufzählungen
    - Bei Follow-up-Fragen berücksichtige den vorherigen Kontext
    """
    
    # Komponenten hinzufügen
    retriever = InMemoryBM25Retriever(document_store=document_store)
    prompt_builder = PromptBuilder(template=context_prompt)
    llm = OpenAIGenerator(api_key=Secret.from_token(openai_api_key), model="gpt-4")
    
    pipe.add_component("retriever", retriever)
    pipe.add_component("prompt_builder", prompt_builder)
    pipe.add_component("llm", llm)
    
    # Komponenten verbinden
    pipe.connect("retriever", "prompt_builder.documents")
    pipe.connect("prompt_builder", "llm")
    
    return pipe

def test_medical_chat():
    # Pipeline erstellen
    pipe = create_medical_chat_pipeline()
    
    # Chat-Verlauf simulieren
    chat_history = []
    
    # Erste Frage
    question1 = "Was übernimmt die AOK bei einem Krankenhausaufenthalt?"
    result1 = pipe.run({
        "retriever": {"query": question1},
        "prompt_builder": {
            "question": question1,
            "chat_history": "\n".join([str(msg) for msg in chat_history])
        }
    })
    
    # Antwort zum Chat-Verlauf hinzufügen
    chat_history.append(ChatMessage.from_user(question1))
    chat_history.append(ChatMessage.from_assistant(result1["llm"]["replies"][0]))
    
    print("\n=== Erste Frage ===")
    print(f"Frage: {question1}")
    print(f"Antwort: {result1['llm']['replies'][0]}")
    
    # Follow-up-Frage
    question2 = "Und was passiert mit meinem Lohn, wenn ich länger bleiben muss?"
    result2 = pipe.run({
        "retriever": {"query": question2},
        "prompt_builder": {
            "question": question2,
            "chat_history": "\n".join([str(msg) for msg in chat_history])
        }
    })
    
    print("\n=== Follow-up-Frage ===")
    print(f"Frage: {question2}")
    print(f"Antwort: {result2['llm']['replies'][0]}")

if __name__ == "__main__":
    test_medical_chat()
