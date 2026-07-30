package com.retailx.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    private String id;
    private Long userId;
    private Long orderId;
    private String message;
    private String status;
    private LocalDateTime timestamp;
}
