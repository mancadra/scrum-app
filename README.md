LoginPage, simple form submit, v console-log vidite login attempt
Narejen tudi FirstTimeLoginPage ker je ideja da admin naredi userja in mu da starter geslo ko se pa user prvic prijavi, spremeni geslo na nekaj svojega
V vnosu so ze omejitve dolzine 12-64 znakov, sanitising in etc. pa je se treba naredit. Password reveal button tudi ze implementiran.






Ker v React data teče navzdol (toraj deeper v component) in ne more nazaj gor, moramo urediti, da bo App.jsx component imel ves info o trenutnem userju.
Nato pa bo sprint component vedel vse o storypointih, etc.