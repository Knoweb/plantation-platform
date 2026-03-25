package com.knoweb.operation.messaging;

public class AiRosterRevisedEvent {
    private String estateId;
    private String date;
    private String aiNotes;

    // Constructors
    public AiRosterRevisedEvent() {}

    public AiRosterRevisedEvent(String estateId, String date, String aiNotes) {
        this.estateId = estateId;
        this.date = date;
        this.aiNotes = aiNotes;
    }

    // Getters and Setters
    public String getEstateId() {
        return estateId;
    }

    public void setEstateId(String estateId) {
        this.estateId = estateId;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getAiNotes() {
        return aiNotes;
    }

    public void setAiNotes(String aiNotes) {
        this.aiNotes = aiNotes;
    }

    @Override
    public String toString() {
        return "AiRosterRevisedEvent{" +
                "estateId='" + estateId + '\'' +
                ", date='" + date + '\'' +
                ", aiNotes='" + aiNotes + '\'' +
                '}';
    }
}
