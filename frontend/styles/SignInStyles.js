import { StyleSheet } from 'react-native';

export const signInStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingVertical: 150,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Plus Jakarta Sans',
    color: '#00CFE8',
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    marginTop: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1E293B',
  },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 15,
  },

  forgotText: {
    color: '#00CFE8',
    fontWeight: '500',
    fontSize: 15,
    display: 'flex',

  },
  signInBtn: {
    backgroundColor: '#00CFE8',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    // Shadow for button
    shadowColor: "#00CFE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnText: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: 'bold',
    marginRight: 10,
    alignItems: 'center',
  },

  BaseText: {
    color: '#64748B',
    marginTop: 35,
    fontSize: 15,
    textAlign: 'center',
  },
  SignUpLinkText: {
    color: '#00CFE8',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    display: 'flex',
    alignSelf: 'flex-end',
  },
});