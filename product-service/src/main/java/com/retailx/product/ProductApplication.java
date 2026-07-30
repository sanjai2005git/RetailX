package com.retailx.product;

import com.retailx.product.model.Product;
import com.retailx.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;

import java.math.BigDecimal;
import java.util.Arrays;

@SpringBootApplication
@EnableCaching
public class ProductApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProductApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(ProductRepository productRepository) {
        return args -> {
            if (productRepository.count() == 0) {
                productRepository.saveAll(Arrays.asList(
                    Product.builder()
                        .name("Premium Wireless Headphones")
                        .description("Noise-cancelling over-ear headphones with 40h battery life.")
                        .price(new BigDecimal("299.99"))
                        .stockQuantity(45)
                        .build(),
                    Product.builder()
                        .name("Mechanical Gaming Keyboard")
                        .description("Tactile brown switches, RGB backlit, aluminum frame.")
                        .price(new BigDecimal("129.50"))
                        .stockQuantity(30)
                        .build(),
                    Product.builder()
                        .name("Ultra-Wide Gaming Monitor")
                        .description("34-inch curved display, 144Hz refresh rate, 1ms response.")
                        .price(new BigDecimal("499.00"))
                        .stockQuantity(15)
                        .build(),
                    Product.builder()
                        .name("Smart Fitness Watch")
                        .description("Heart rate monitor, GPS tracking, waterproof, 7-day battery.")
                        .price(new BigDecimal("189.99"))
                        .stockQuantity(60)
                        .build()
                ));
            }
        };
    }
}
