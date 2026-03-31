import { StyleSheet } from 'react-native';

export const signInStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingVertical: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    color: '#00CFE8',
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    marginTop: 20,
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
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 40,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#94A3B8',
    fontSize: 13,
  },
  ssoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  ssoButton: {
    flex: 0.48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 54,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  ssoBtnText: {
    fontWeight: '600',
    color: '#475569',
    fontSize: 14,
  },
  signUpLink: {
    marginTop: 40,
    marginBottom: 30,
  },
  footerBaseText: {
    color: '#64748B',
    fontSize: 15,
  },
  footerLinkText: {
    color: '#00CFE8',
    fontWeight: 'bold',
  },
  complianceBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  complianceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  complianceText: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});