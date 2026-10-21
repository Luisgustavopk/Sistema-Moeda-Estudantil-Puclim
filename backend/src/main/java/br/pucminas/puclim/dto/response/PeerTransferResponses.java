package br.pucminas.puclim.dto.response;

import java.time.Instant;
import java.util.List;

public final class PeerTransferResponses {
    private PeerTransferResponses() {
    }

    public record Member(String id, String name, String course, boolean active) {
    }

    public record Group(String teacherId, String teacherName, String criteria, List<Member> students) {
    }

    public record Request(String id, String teacherId, String teacherName, String senderId, String senderName,
            String recipientId, String recipientName, long amount, String reason, String criteria,
            String status, String feedback, Instant createdAt, Instant reviewedAt) {
    }

    public record Overview(List<Group> groups, List<Member> availableStudents, List<Request> requests) {
    }
}
