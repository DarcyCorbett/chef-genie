import streamlit as st
import google.generativeai as genai

# 1. Configure the Page
st.set_page_config(page_title="My AI App", page_icon="🤖")

# 2. Setup the Gemini API
# We get the API key from the secret settings (we set this up next!)
api_key = st.secrets["GEMINI_API_KEY"]
genai.configure(api_key=api_key)

# 3. Create the Model
# If you used a specific system instruction in AI Studio, paste it inside the quotes below.
system_instruction = "You are a helpful assistant." 
model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=system_instruction)

# 4. Build the Chat Interface
st.title("My AI Assistant")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat messages from history on app rerun
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# React to user input
if prompt := st.chat_input("What is up?"):
    # Display user message in chat message container
    st.chat_message("user").markdown(prompt)
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Display assistant response in chat message container
    with st.chat_message("assistant"):
        try:
            # Send the message to Gemini
            chat = model.start_chat(history=[
                {"role": m["role"], "parts": [m["content"]]} 
                for m in st.session_state.messages[:-1] # All messages except the last one we just added
            ])
            response = chat.send_message(prompt)
            st.markdown(response.text)
            
            # Add assistant response to chat history
            st.session_state.messages.append({"role": "assistant", "content": response.text})
        except Exception as e:
            st.error(f"An error occurred: {e}")
