package com.retailx.notification.consumer;

import com.retailx.notification.dto.PaymentEvent;
import com.retailx.notification.model.Notification;
import com.retailx.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class PaymentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventConsumer.class);

    private final NotificationService notificationService;

    public PaymentEventConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = "${rabbitmq.queue.payment}")
    public void consumePaymentEvent(PaymentEvent paymentEvent) {
        log.info("Received PaymentEvent for Order ID: {}", paymentEvent.getOrderId());

        try {
            String message;
            if ("SUCCESS".equalsIgnoreCase(paymentEvent.getStatus())) {
                message = String.format("Success! Your payment of $%s for Order #%d was processed successfully. Transaction ID: %s.",
                        paymentEvent.getAmount(), paymentEvent.getOrderId(), paymentEvent.getTransactionId());
            } else {
                message = String.format("Failed! Your payment for Order #%d failed. Please try again.",
                        paymentEvent.getOrderId());
            }

            Notification notification = Notification.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(paymentEvent.getUserId())
                    .orderId(paymentEvent.getOrderId())
                    .message(message)
                    .status(paymentEvent.getStatus())
                    .timestamp(LocalDateTime.now())
                    .build();

            notificationService.addNotification(notification);
            log.info("Registered notification for User ID: {}", paymentEvent.getUserId());

        } catch (Exception ex) {
            log.error("Failed to process notification for Order ID: {}", paymentEvent.getOrderId(), ex);
        }
    }
}
