package com.retailx.notification.service;

import com.retailx.notification.model.Notification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationService {

    private final List<Notification> notifications = new CopyOnWriteArrayList<>();

    public void addNotification(Notification notification) {
        notifications.add(0, notification); // Add at the beginning (latest first)
    }

    public List<Notification> getAllNotifications() {
        return new ArrayList<>(notifications);
    }
}
