package com.retailx.order.service;

import com.retailx.order.dto.OrderEvent;
import com.retailx.order.dto.OrderRequest;
import com.retailx.order.model.Order;
import com.retailx.order.repository.OrderRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange.order}")
    private String exchange;

    @Value("${rabbitmq.routingkey.order}")
    private String routingKey;

    public OrderService(OrderRepository orderRepository, RabbitTemplate rabbitTemplate) {
        this.orderRepository = orderRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public Order placeOrder(OrderRequest request) {
        Order order = Order.builder()
                .productId(request.getProductId())
                .userId(request.getUserId())
                .quantity(request.getQuantity())
                .totalPrice(request.getTotalPrice())
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);

        // Send order event to RabbitMQ
        OrderEvent orderEvent = OrderEvent.builder()
                .orderId(savedOrder.getId())
                .productId(savedOrder.getProductId())
                .userId(savedOrder.getUserId())
                .quantity(savedOrder.getQuantity())
                .totalPrice(savedOrder.getTotalPrice())
                .status(savedOrder.getStatus())
                .build();

        rabbitTemplate.convertAndSend(exchange, routingKey, orderEvent);

        return savedOrder;
    }

    public List<Order> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
}
