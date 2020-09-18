package api

import "testing"

func TestAuth_Authenticate(t *testing.T) {
	auth := NewAuth("./","password")
	auth.AddUser("shurik","prikluchenija")

	if !auth.Authenticate("shurik","prikluchenija") {
		t.Fatal("Authentication failed 1 ")
	}
	if auth.Authenticate("shurik","world") {
		t.Fatal("Authentication failed 2 ")
	}
	auth.SaveUserDB()


	auth2 := NewAuth("./","password")
	auth2.LoadUserDB()
	if !auth2.Authenticate("shurik","prikluchenija") {
		t.Fatal("Authentication failed 3 ")
	}

}
