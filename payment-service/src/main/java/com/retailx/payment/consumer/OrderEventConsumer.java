package com.retailx.payment.consumer;

import com.retailx.payment.dto.OrderEvent;
import com.retailx.payment.dto.PaymentEvent;
import com.retailx.payment.model.Payment;
import com.retailx.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    private final PaymentRepository paymentRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange.payment}")
    private String paymentExchange;

    @Value("${rabbitmq.routingkey.payment}")
    private String paymentRoutingKey;

    public OrderEventConsumer(PaymentRepository paymentRepository, RabbitTemplate rabbitTemplate) {
        this.paymentRepository = paymentRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = "${rabbitmq.queue.order}")
    public void consumeOrderEvent(OrderEvent orderEvent) {
        log.info("Received OrderEvent for Order ID: {}", orderEvent.getOrderId());

        try {
            // Process Mock Payment (90% success rate, or successful if amount is valid)
            String status = "SUCCESS";
            if (orderEvent.getTotalPrice() == null || orderEvent.getTotalPrice().doubleValue() <= 0) {
                status = "FAILED";
            }

            String transactionId = UUID.randomUUID().toString();

            Payment payment = Payment.builder()
                    .orderId(orderEvent.getOrderId())
                    .userId(orderEvent.getUserId())
                    .amount(orderEvent.getTotalPrice())
                    .status(status)
                    .transactionId(transactionId)
                    .createdAt(LocalDateTime.now())
                    .build();

            Payment savedPayment = paymentRepository.save(payment);
            log.info("Saved Payment ID: {} with status: {}", savedPayment.getId(), status);

            // Publish Payment Event
            PaymentEvent paymentEvent = PaymentEvent.builder()
                    .paymentId(savedPayment.getId())
                    .orderId(savedPayment.getOrderId())
                    .userId(savedPayment.getUserId())
                    .amount(savedPayment.getAmount())
                    .status(savedPayment.getStatus())
                    .transactionId(savedPayment.getTransactionId())
                    .build();

            rabbitTemplate.convertAndSend(paymentExchange, paymentRoutingKey, paymentEvent);
            log.info("Published PaymentEvent for Order ID: {}", orderEvent.getOrderId());

        } catch (Exception ex) {
            log.error("Failed to process payment for Order ID: {}", orderEvent.getOrderId(), ex);
        }
    }
}
