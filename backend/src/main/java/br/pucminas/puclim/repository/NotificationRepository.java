package br.pucminas.puclim.repository;
import br.pucminas.puclim.entity.Notification;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<Notification, String> { Page<Notification> findByAccountIdOrderByDateDesc(String id, Pageable pageable); }