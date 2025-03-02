package kz.ai.sarbaz.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.mistralai.MistralAiChatModel;
import org.springframework.ai.mistralai.MistralAiChatOptions;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaModel;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class ApplicationConfiguration {

    @Primary
    @Bean("ollamaChatClient")
    public ChatClient ollamaChatClient(OllamaChatModel ollamaChatModel) {
        return ChatClient.create(ollamaChatModel);
    }

//    @Bean("mistralChatClient")
//    public ChatClient mistralChatClient(MistralAiChatModel mistralAiChatModel) {
//        return ChatClient.create(mistralAiChatModel);
//    }

}
