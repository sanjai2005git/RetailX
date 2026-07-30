package com.retailx.order.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderRequest {
    private Long productId;
    private Long userId;
    private Integer quantity;
    private BigDecimal totalPrice;
}
