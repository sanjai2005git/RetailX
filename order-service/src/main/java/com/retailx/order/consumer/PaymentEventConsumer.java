package com.retailx.order.consumer;

import com.retailx.order.dto.PaymentEvent;
import com.retailx.order.model.Order;
import com.retailx.order.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventConsumer.class);

    private final OrderRepository orderRepository;

    public PaymentEventConsumer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @RabbitListener(queues = "${rabbitmq.queue.payment}")
    public void consumePaymentEvent(PaymentEvent paymentEvent) {
        log.info("Received PaymentEvent for Order ID: {} with status: {}", paymentEvent.getOrderId(), paymentEvent.getStatus());

        try {
            Order order = orderRepository.findById(paymentEvent.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Order not found with id: " + paymentEvent.getOrderId()));

            if ("SUCCESS".equalsIgnoreCase(paymentEvent.getStatus())) {
                order.setStatus("SUCCESS");
            } else {
                order.setStatus("FAILED");
            }

            orderRepository.save(order);
            log.info("Successfully updated Order ID: {} status to: {}", order.getId(), order.getStatus());

        } catch (Exception ex) {
            log.error("Failed to update status for Order ID: {}", paymentEvent.getOrderId(), ex);
        }
    }
}
