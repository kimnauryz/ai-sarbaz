package kz.ai.sarbaz.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
    }
    
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Маршрут для Vue приложения
        registry.addViewController("/app").setViewName("forward:/static/vue-chat.html");
        
        // Перенаправление с корня на приложение
        registry.addViewController("/").setViewName("redirect:/app");
    }
}