var express = require("express"); 
var static = require("serve-static");
var http = require("http");
var fs = require("fs");
var ejs = require("ejs");//new
var common = require("./common.js");//msg와 url을 등록하는 함수 가져오기
var mysql = require("mysql");
var app = express();
var url = require("url"); 

let conStr={
    url:"localhost",
    user:"test1116",
    password:"1234",
    database:"test1116"
};

let con;

var userJson= {
	member_id: 0,
	id: "",
	password : "",
	eamil: "",
	regdate: ""
};

var emptyJson= {
	member_id: 0,
	id: "",
	password : "",
	eamil: "",
	regdate: ""
};

function connect(){
	con = mysql.createConnection(conStr);
	console.log("connected...");
}

app.use(static(__dirname + "/static"));

app.use(express.urlencoded({
	extended: true,
}));

//홈 주소 index로 변경
app.get("/index", function(request, response){
	fs.readFile("./index.ejs", "utf-8", function(error, data){
		if(error){
			console.log("index.ejs reading error : ", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(ejs.render(data, {
				sessionId : userJson.id
			}));
		}
	});
});

//member/regist : 회원가입 기능 추가 (닉네임 추가)
app.post("/member/regist", function(request, response){
	var id = request.body.regist_id;
	var password = request.body.regist_pass;
	var repassword = request.body.regist_repass;
	var nickname = request.body.regist_nickname;
	var email = request.body.regist_email + "@" + request.body.regist_emailAdd;
	var genre_id = request.body.genre_id;
	
	var sql = "select * from member where id = '" + id + "'";
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("ID double check error : ", error);
		}else{
			var n = record.length;

			if(n > 0){
				
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("ID is duplicated", "/index#sign"));
			}else{
				sql = "INSERT INTO member (id, password, email, nickname) VALUES (?, ?, ?, ?)";
				con.query(sql, [id, password, email, nickname], function(error, fields){
					if(error){
						console.log("failed member regist ", error);
					}else{
						sql="select last_insert_id() as member_id";
			
						con.query(sql, function(error, record, fields){
							if(error){
								console.log("pk가져오기 실패", error);
							}else{
								var member_id = record[0].member_id;
								
								for(var i = 0; i<genre_id.length; i++){
									var n = 0;
									sql="insert into member_genre(member_id, genre_id) values("+member_id+" , "+genre_id[i]+")"; 
									//쿼리 실행
									con.query(sql, function(err){
										if(err){
											alert("회원정보 등록 실패");
										}else{
											//마지막 genre_id일때만 response.end 호출 왜? getMsgURL 함수가 insert 한 건당 location.href를 호출해서 에러가 남
											n++;
											if(n == genre_id.length){
												response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
												response.end(common.getMsgURL("회원가입완료", "/index#sign"));
											}
										}
									});
								}
							}
						});
					}
				});
			}
		}
	});
});

//member/login : 로그인 기능 추가. session 필요
//(로그인이 되었을 때, 로그인 버튼이 로그아웃으로 변한다던지 등등...)
//세션 주는 것을 찾아보니 복잡하고 새로운 모듈을 익혀야 되어서 일단 index_loggin.ejs를 만들어서
//로그인 시 로그인/회원가입이 없는 새로운 ejs로 전환시킴....(6일차)
app.post("/member/login", function(request, response){
	var id = request.body.login_id;
	var password = request.body.login_pass;
	var sql = "SELECT * FROM member WHERE id=? AND password=?";
	con.query(sql, [id, password], function(error, rows, fields){
		if(error){
			console.log("failed member login ", error);
		}else{
			if(rows == 0){
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("로그인실패", "/index#login"));
			}else{
				userJson = rows[0];
				console.log(userJson);
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("로그인완료", "/index_loggin"));
			}
		}
	});
});

//로그인 후 수정된 index_loggin.ejs 페이지로 전환해줌(6일차) 
app.get("/index_loggin", function(request, response){
	fs.readFile("./index.ejs", "utf-8", function(error, data){
		if(error){
			console.log("index.ejs reading error : ", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(ejs.render(data, {
				sessionId : userJson.id
			}));
		}
	});
});
//로그아웃 index.ejs 페이지로  다시 전환해줌(6일차) 
app.get("/index_loggout", function(request, response){
	fs.readFile("./index.ejs", "utf-8", function(error, data){
		if(error){
			console.log("index.ejs reading error : ", error);
		}else{
			userJson = emptyJson;
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(ejs.render(data, {
				sessionId : userJson.id
			}));

		}
	});
});


//로그인 상태에서 (마이페이지)
app.get("/mypage", function(request, response){
	fs.readFile("./mypage.ejs", "utf-8", function(error, data){
		if(error){
			console.log("mypage.ejs reading error : ", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(ejs.render(data, {
				sessionId : userJson.id,
				userInfo : userJson
			}));

		}
	});
});

//회원 정보  update (마이페이지)
app.post("/mypage_update", function(request, response){
	var member_id = parseInt(request.body.member_id);
	var password = request.body.password;
	var repassword = request.body.repassword;
	var nickname = request.body.nickname;

	if(password != repassword){
		response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
		response.end(common.getMsgURL("두 비밀번호가 일치하지 않습니다.", "/mypage"));
	}else{
		var sql = "update member set password = ?, nickname =? where member_id = ?";
		con.query(sql, [password, nickname, member_id], function(error, record, fields){
			if(error){
				console.log("회원정보 수정 실패", error);
			}else{
				//회원정보가 갱신되면 바뀌어진 정보를 userJson에 넣어준다. ->세션 갱신
				userJson.password = password;
				userJson.nickname = nickname;
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("회원정보 수정 성공", "/mypage"));	
			}
		})
	}
});

//adminpage (11/24)
app.get("/adminpage", function(request, response){
	var sql = "select * from member order by member_id desc";

	con.query(sql, function(error, record, fields){
		if(error){
			console.log("sql error", error);
		}else{
			fs.readFile("./adminpage.ejs", "utf-8", function(err, data){
				if(err){
					console.log("adminpage ejs reading error", err);
				}else{
					response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
					response.end(ejs.render(data, {
						loginState : "로그아웃",
						sessionId : userJson.id,
						memberArray:record
					}))
				}
			})
		}
	});
});

app.get("/write", function(request, response){
	fs.readFile("./writeForm.ejs", "utf-8", function(error, data){
		if(error){
			console.log("writeForm.ejs reading error : ", error);
		}else{
			if(userJson.id == ""){
				var tag = "<script>alert('로그인을 먼저 해주세요');location.href='/index#sign';</script>"
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(tag);
			}else{
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(ejs.render(data, {
					sessionId : userJson.id
				}));
			}
		}
	});
});

//아이디찾기
app.get("/findId", function(request, response){
	fs.readFile("./findId.ejs", "utf-8", function(error, data){
		if(error){
			console.log("findId.ejs reading error : ", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(ejs.render(data, {
				sessionId : userJson.id,
				userInfo : userJson
			}));

		}
	});
});

app.post("/findId_do", function(request, response){
	var email = request.body.email;
	console.log("email: "+email);

	var sql = "select * from member where email = '"+email+"'";

	con.query(sql, function(error, record, fields){
		if(error){
			console.log("이메일을 통한 아이디 조회 실패", error);
		}else{
			fs.readFile("./findIdView.ejs", "utf-8", function(error, data){
				if(error){
					console.log("findIdView.ejs reading error : ", error);
				}else{
					console.log(record[0]);
					var message;
					var result = false;

					if(record[0] != null){
						result = true;
						var index = record[0].id.length - 2;
						var tmpId = record[0].id.substring(0, 2); // 0번문자 ~ 2번 전까지
						
						for(var i = 0; i < index; i++){
							tmpId += "*";
						
						}
					}
					response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
					response.end(ejs.render(data, {
						sessionId : userJson.id,
						userInfo : userJson,
						id : tmpId,
						flag : result
					}));
				}
			});
		}
	});

});

//글쓰기 후 board_poem가기 (2일차)
app.post("/poemdo", function(request, response){
	var title = request.body.title;
	var writer = userJson.id;
	var content = request.body.content;

	var sql = "insert into poem(title, writer, content) values(?, ?, ?)";

	con.query(sql, [title, writer, content], function(error, fields){
		if(error){
			console.log("글 쓰기 실패", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(common.getMsgURL("글 쓰기 등록", "/board_poem"));
		}
	});
});

//board_poem에서 등록된 poem 불러오기 (2일차)
app.get("/board_poem", function(request, response){
	var sql = "SELECT * from poem";
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("시 목록 불러오기 실패 ", error);
		}else{
			
			console.log("record"+record);
			fs.readFile("board_poem.ejs", "utf-8", function(error, data){
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(ejs.render(data, {
					poemArray: record
					, sessionId: userJson.id
				}));
			});
		}
	});
});

//detail_poem(목록에서 시 상세보기)으로 가기 (조회수 25)
app.get("/detail_poem", function(request, response){
	var poem_id = request.query.poem_id;

	console.log("poem_id : " + poem_id);
	var sql = "update poem set hit = hit+1 where poem_id = "+poem_id;
	
	
	con.query(sql, function(error, fields){
		if(error){
			console.log("조회수 올리기 실패", error);
		}else{
			sql = "select * from poem where poem_id ="+poem_id;
			
			con.query(sql, function(error, record, fields){
				fs.readFile("detail_poem.ejs", "utf-8", function(error ,data){
					if(error){
						console.log("시 상세 ejs 불러오기 실패", error);
					}else{
						response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
						response.end(ejs.render(data, {
							poem: record[0]
							, sessionId : userJson.id
						}));
					}
				});

			})

		}
	})
});

//글쓰기 후 board_story가기 (3일차)
app.post("/storydo", function(request, response){
	var title = request.body.title;
	var writer = userJson.id;
	var content = request.body.content;

	var sql = "insert into story(title, writer, content) values(?, ?, ?)";

	con.query(sql, [title, writer, content], function(error, fields){
		if(error){
			console.log("글 쓰기 실패", error);
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(common.getMsgURL("글 쓰기 등록", "/board_story"));
		}
	});
});

//board_story에서 등록된 story 불러오기 (3일차)
app.get("/board_story", function(request, response){
	var sql = "SELECT * from story";
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("시 목록 불러오기 실패 ", error);
		}else{
			fs.readFile("board_story.ejs", "utf-8", function(error, data){
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(ejs.render(data, {
					storyArray: record
					, sessionId: userJson.id
				}));
			});
		}
	});
});

//detail_story(목록에서 시 상세보기)으로 가기 (조회수 25)
app.get("/detail_story", function(request, response){
	var story_id = request.query.story_id;

	console.log("story_id : " + story_id);
	
	var sql = "update story set hit = hit+1 where story_id = "+story_id;
	
	con.query(sql, function(error, fields){
		if(error){
			console.log("글 한 편 조회 실패", error);
		}else{
			sql = "select * from story where story_id ="+story_id;

			con.query(sql, function(error,record, fields){
				sql = "select  story_id, writer, content, date_format(regdate, '%Y-%m-%d-%H:%i') regdate from comment where story_id ="+story_id;

				con.query(sql, function(error, rows, fields){
					fs.readFile("detail_story.ejs", "utf-8", function(error, data){
						if(error){
							console.log("글 상세 ejs 불러오기 실패", error);
						}else{
							console.log("row: "+rows);
							response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
							response.end(ejs.render(data, {
								story: record[0]
								, sessionId : userJson.id,
								commentArray : rows
							}));
						}
					});

				})


			})

		}
	})
});

app.get("/regist/comment", function(request, response){
	var writer = userJson.id;
	var story_id = request.query.story_id;
	var content = request.query.content; 

	console.log("writer : " + writer);
	console.log("story_id : " + story_id);
	console.log("content : " + content);

	var sql = "insert into comment(writer, story_id, content) values (?, ?, ?)";

	con.query(sql, [writer, story_id, content], function(error, record, fields){
		if(error){
			console.log("failed to insert comment");
		}else{
			response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
			response.end(common.getMsgURL("댓글 입력 성공", "/detail_story?story_id="+story_id));
		}
	});
});


//삭제(4일차)
app.get("/delete_poem", function(request, response){
	var poem_id = request.query.poem_id;
	
	var sql = "delete from poem where poem_id ="+poem_id;
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("시 한 편 삭제 실패", error);
		}else{
			if(error){
				console.log("시 목록 ejs 불러오기 실패", error);
			}else{
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("글 삭제 성공", "/board_poem"));
			}
		}
	})
});

//수정폼으로 이동(4일차)
app.get("/updateForm_poem", function(request, response){
	var poem_id = request.query.poem_id;
	
	var sql = "select * from poem where poem_id ="+poem_id;
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("시 한 편 조회 실패", error);
		}else{
			fs.readFile("updateForm_poem.ejs", "utf-8", function(error, data){
				if(error){
					console.log("시 상세 ejs 불러오기 실패", error);
				}else{
					response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
					response.end(ejs.render(data, {
						poem: record[0]
						, sessionId : userJson.id
					}));
				}
			});
		}
	})
});

//수정후 시 목록으로...(4일차) -> 파라미터 값이 null로 옴...(오류)
app.get("/update_poem", function(request, response){
	var poem_id = parseInt(request.query.poem_id);
	var title = request.query.title;
	var writer = userJson.id;
	var content = request.query.content;
	
	var sql = "update poem set title = ?, writer =?, content = ? where poem_id = ?";
	
	con.query(sql, [title, writer, content, poem_id],function(error, record, fields){
		if(error){
			console.log("시 한 편 수정 실패", error);
		}else{
			if(error){
				console.log("시 목록 ejs 불러오기 실패", error);
			}else{
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("글 수정 성공", "/board_poem"));
			}
		}
	})
});

//삭제(4일차)
app.get("/delete_story", function(request, response){
	var story_id = request.query.story_id;
	
	var sql = "delete from story where story_id ="+story_id;
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("글 한 편 삭제 실패", error);
		}else{
			if(error){
				console.log("글 목록 ejs 불러오기 실패", error);
			}else{
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("글 삭제 성공", "/board_story"));
			}
		}
	})
});

//수정폼으로 이동(4일차)
app.get("/updateForm_story", function(request, response){
	var story_id = request.query.story_id;
	
	var sql = "select * from story where story_id ="+story_id;
	
	con.query(sql, function(error, record, fields){
		if(error){
			console.log("시 한 편 조회 실패", error);
		}else{
			fs.readFile("updateForm_story.ejs", "utf-8", function(error, data){
				if(error){
					console.log("시 상세 ejs 불러오기 실패", error);
				}else{
					response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
					response.end(ejs.render(data, {
						story: record[0]
						, sessionId : userJson.id
					}));
				}
			});
		}
	})
});

//수정후 글 목록으로...(4일차)
app.get("/update_story", function(request, response){
	var story_id = parseInt(request.query.story_id);
	var title = request.query.title;
	var writer = userJson.id;
	var content = request.query.content;
	
	var sql = "update story set title = ?, writer =?, content = ? where story_id = ?";
	
	con.query(sql, [title, writer, content, story_id],function(error, record, fields){
		if(error){
			console.log("글 한 편 수정 실패", error);
		}else{
			if(error){
				console.log("글 목록 ejs 불러오기 실패", error);
			}else{
				response.writeHead(200, {"Content-Type":"text/html;charset=utf-8"});
				response.end(common.getMsgURL("글 수정 성공", "/board_story"));
			}
		}
	})
});

var server = http.createServer(app);

server.listen(3093, function(){
	console.log("The Siru Server is running at port 3093");
	connect();
});